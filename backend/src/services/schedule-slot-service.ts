import { ScheduleSlotRepository } from '../repositories/schedule-slot-repository';
import { ActivityLogService } from './activity-log-service';

// service de escala (slot de agenda). concentra as regras de negocio
// sobre as janelas de atendimento: listar com filtro de periodo,
// buscar, criar, atualizar e remover.
// aqui a gente valida datas, capacidade e responsavel, impede alteracao
// de escala que ainda tem agendamento ativo e registra auditoria
// para a equipe (admin e farmaceutico).
export class ScheduleSlotService {
  private slotRepo: ScheduleSlotRepository;
  private logService: ActivityLogService;

  constructor() {
    // repositorio de escala e service de log de auditoria.
    this.slotRepo = new ScheduleSlotRepository();
    this.logService = new ActivityLogService();
  }

  // lista escalas. aceita filtro opcional de periodo (data inicial
  // e final). as datas sao parseadas aqui e repassadas pro repositorio.
  async getAll(startDate?: string, endDate?: string) {
    let parsedStartDate: Date | undefined;
    let parsedEndDate: Date | undefined;

    // se veio startdate, precisa parsear.
    if (startDate) {
      parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        throw { statusCode: 400, message: 'Data inicial inválida' };
      }
    }

    // idem pro enddate.
    if (endDate) {
      parsedEndDate = new Date(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        throw { statusCode: 400, message: 'Data final inválida' };
      }
    }

    // chama o repositorio (/repositories/schedule-slot-repository.ts)
    // com o filtro ja normalizado.
    return this.slotRepo.findAll({
      startDate: parsedStartDate,
      endDate: parsedEndDate,
    });
  }

  // busca uma escala pelo id. se nao achar, lanca 404.
  async getById(id: number) {
    const slot = await this.slotRepo.findById(id);
    if (!slot) {
      throw { statusCode: 404, message: 'Horário de escala não encontrado' };
    }
    return slot;
  }

  // cria uma nova escala. valida data, horario, capacidade e responsavel.
  // se ja existir escala com o mesmo par (data, horario), devolve 409
  // (o unique do banco tambem protege contra corrida).
  async create(userId: number, role: string, data: {
    date: string | Date;
    timeSlot: string;
    maxCapacity?: number;
    assignedToId: number;
  }) {
    const { date, timeSlot, maxCapacity, assignedToId } = data;

    // normaliza o horario com trim.
    let cleanTimeSlot = undefined;
    if (timeSlot) {
      cleanTimeSlot = timeSlot.trim();
    } else {
      cleanTimeSlot = undefined;
    }

    // data e horario sao obrigatorios.
    if (!date) {
      throw { statusCode: 400, message: 'Data e horário do slot são obrigatórios' };
    } else {
      if (!cleanTimeSlot) {
        throw { statusCode: 400, message: 'Data e horário do slot são obrigatórios' };
      }
    }

    // valida a data.
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw { statusCode: 400, message: 'Data da escala inválida' };
    }

    // capacidade: padrao 5, se veio precisa ser numero positivo.
    let parsedCapacity = 5;
    if (maxCapacity !== undefined) {
      parsedCapacity = Number(maxCapacity);
    } else {
      parsedCapacity = 5;
    }

    if (isNaN(parsedCapacity)) {
      throw { statusCode: 400, message: 'A capacidade máxima deve ser um número inteiro positivo' };
    } else {
      if (parsedCapacity <= 0) {
        throw { statusCode: 400, message: 'A capacidade máxima deve ser um número inteiro positivo' };
      }
    }

    // responsavel e obrigatorio e precisa ser numero positivo.
    const parsedAssignedTo = Number(assignedToId);
    if (isNaN(parsedAssignedTo) || parsedAssignedTo <= 0) {
      throw { statusCode: 400, message: 'Farmacêutico responsável é obrigatório' };
    }

    try {
      // chama o repositorio (/repositories/schedule-slot-repository.ts)
      // pra criar a escala.
      const slot = await this.slotRepo.create({
        date: parsedDate,
        timeSlot: cleanTimeSlot,
        maxCapacity: parsedCapacity,
        assignedToId: parsedAssignedTo,
      });

      // log so pra equipe.
      let isStaff = false;
      if (role === 'FARMACEUTICO') {
        isStaff = true;
      } else {
        if (role === 'ADMIN') {
          isStaff = true;
        } else {
          isStaff = false;
        }
      }

      if (isStaff) {
        await this.logService.log(
          userId,
          'create',
          'scheduleSlots',
          slot.id,
          `Criou escala de atendimento para ${new Date(slot.date).toLocaleDateString('pt-BR')} às ${slot.timeSlot}`
        );
      }

      return slot;
    } catch (err: any) {
      // captura o erro de unicidade do prisma (mesmo par data + horario)
      // e devolve 409 com mensagem clara pro cliente.
      let isUniqueConstraint = false;
      if (err.message) {
        if (err.message.includes('Unique constraint')) {
          isUniqueConstraint = true;
        }
      }
      if (err.code === 'P2002') {
        isUniqueConstraint = true;
      }
      if (isUniqueConstraint) {
        throw { statusCode: 409, message: 'Já existe um horário cadastrado nessa mesma data e hora' };
      }
      throw err;
    }
  }

  // atualiza uma escala. bloqueia a alteracao se houver agendamento
  // ativo (pending ou confirmed) porque isso mudaria a agenda de
  // pacientes que ja contam com aquele horario.
  async update(userId: number, role: string, id: number, data: {
    date?: string | Date;
    timeSlot?: string;
    maxCapacity?: number;
    assignedToId?: number | null;
  }) {
    const slot = await this.slotRepo.findById(id);
    if (!slot) {
      throw { statusCode: 404, message: 'Horário de escala não encontrado' };
    }

    // trava de seguranca: nao mexe em escala com agendamento ativo.
    const activeAppointments = slot.appointments.filter((appointment) => appointment.status === 'PENDING' || appointment.status === 'CONFIRMED');
    if (activeAppointments.length > 0) {
      throw { statusCode: 409, message: 'Não é possível alterar uma escala com agendamentos ativos' };
    }

    const updateData: any = {};

    // data, se veio, precisa parsear.
    if (data.date) {
      const parsedDate = new Date(data.date);
      if (isNaN(parsedDate.getTime())) {
        throw { statusCode: 400, message: 'Data da escala inválida' };
      }
      updateData.date = parsedDate;
    }

    // horario nao pode ser vazio quando veio.
    if (data.timeSlot !== undefined) {
      const cleanTimeSlot = data.timeSlot.trim();
      if (!cleanTimeSlot) {
        throw { statusCode: 400, message: 'Horário do slot não pode ser vazio' };
      }
      updateData.timeSlot = cleanTimeSlot;
    }

    // capacidade positiva quando veio.
    if (data.maxCapacity !== undefined) {
      const parsedCapacity = Number(data.maxCapacity);
      if (isNaN(parsedCapacity)) {
        throw { statusCode: 400, message: 'A capacidade máxima deve ser um número inteiro positivo' };
      } else {
        if (parsedCapacity <= 0) {
          throw { statusCode: 400, message: 'A capacidade máxima deve ser um número inteiro positivo' };
        }
      }
      updateData.maxCapacity = parsedCapacity;
    }

    // responsavel, quando veio, nao pode ser null (escala precisa de dono).
    if (data.assignedToId !== undefined) {
      if (data.assignedToId === null) {
        throw { statusCode: 400, message: 'Farmacêutico responsável é obrigatório' };
      } else {
        const parsedAssignedTo = Number(data.assignedToId);
        if (isNaN(parsedAssignedTo)) {
          throw { statusCode: 400, message: 'ID de responsável inválido' };
        }
        updateData.assignedToId = parsedAssignedTo;
      }
    }

    try {
      // chama o repositorio (/repositories/schedule-slot-repository.ts)
      // pra persistir as mudancas.
      const updated = await this.slotRepo.update(id, updateData);

      // log so pra equipe.
      let isStaff = false;
      if (role === 'FARMACEUTICO') {
        isStaff = true;
      } else {
        if (role === 'ADMIN') {
          isStaff = true;
        } else {
          isStaff = false;
        }
      }

      if (isStaff) {
        await this.logService.log(
          userId,
          'update',
          'scheduleSlots',
          id,
          `Atualizou escala #${id}`
        );
      }

      return updated;
    } catch (err: any) {
      // mesmo tratamento de unicidade do create (mudou pra um par ja existente).
      let isUniqueConstraint = false;
      if (err.message) {
        if (err.message.includes('Unique constraint')) {
          isUniqueConstraint = true;
        }
      }
      if (err.code === 'P2002') {
        isUniqueConstraint = true;
      }
      if (isUniqueConstraint) {
        throw { statusCode: 409, message: 'Já existe um horário cadastrado nessa mesma data e hora' };
      }
      throw err;
    }
  }

  // remove (soft delete via active=false) uma escala.
  // mesma trava do update: nao deixa remover se houver agendamento ativo.
  async delete(userId: number, role: string, id: number) {
    const slot = await this.slotRepo.findById(id);
    if (!slot) {
      throw { statusCode: 404, message: 'Horário de escala não encontrado' };
    }

    // mesma trava de agendamento ativo.
    const activeAppointments = slot.appointments.filter((appointment) => appointment.status === 'PENDING' || appointment.status === 'CONFIRMED');
    if (activeAppointments.length > 0) {
      throw { statusCode: 409, message: 'Não é possível remover uma escala com agendamentos ativos' };
    }

    // chama o repositorio (/repositories/schedule-slot-repository.ts) pra
    // desativar (soft delete).
    await this.slotRepo.delete(id);

    // log so pra equipe.
    let isStaff = false;
    if (role === 'FARMACEUTICO') {
      isStaff = true;
    } else {
      if (role === 'ADMIN') {
        isStaff = true;
      } else {
        isStaff = false;
      }
    }

    if (isStaff) {
      await this.logService.log(
        userId,
        'delete',
        'scheduleSlots',
        id,
        `Removeu/desativou escala #${id}`
      );
    }

    return { success: true };
  }
}