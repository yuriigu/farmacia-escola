import { AppointmentRepository } from '../repositories/appointment-repository';
import { ScheduleSlotRepository } from '../repositories/schedule-slot-repository';
import { MedicineRepository } from '../repositories/medicine-repository';
import { PatientRepository } from '../repositories/patient-repository';
import { ActivityLogService } from './activity-log-service';
import { prisma } from '../utils/prisma';

// service de agendamento (consulta). concentra a regra de negocio
// mais pesada do sistema: criar consulta, mudar status, dispensar
// medicamentos e estornar dispensacao.
// e aqui que ficam as validacoes de saldo real (estoque fisico menos
// reservas), fefo, transacoes de baixa no estoque e log de auditoria.
export class AppointmentService {
  private appointmentRepo: AppointmentRepository;
  private slotRepo: ScheduleSlotRepository;
  private medicineRepo: MedicineRepository;
  private patientRepo: PatientRepository;
  private logService: ActivityLogService;

  constructor() {
    // instanciamos os repositorios e o service de log
    // (que e quem grava os registros de auditoria de cada acao).
    this.appointmentRepo = new AppointmentRepository();
    this.slotRepo = new ScheduleSlotRepository();
    this.medicineRepo = new MedicineRepository();
    this.patientRepo = new PatientRepository();
    this.logService = new ActivityLogService();
  }

  // lista agendamentos. paciente ve so os proprios, equipe ve tudo
  // e aceita filtro opcional por paciente.
  async getAll(role: string, userId: number, patientId?: number | null) {
    // se for paciente, buscamos o cadastro dele pra filtrar.
    // se por algum motivo nao existir, devolvemos lista vazia.
    if (role === 'PACIENTE') {
      const patient = await this.patientRepo.findByUserId(userId);
      if (!patient) {
        return [];
      }
      return this.appointmentRepo.findAll(patient.id);
    }

    // pra equipe, aplica o filtro de paciente so quando veio.
    let targetId = undefined;
    if (patientId !== null && patientId !== undefined) {
      targetId = patientId;
    } else {
      targetId = undefined;
    }
    return this.appointmentRepo.findAll(targetId);
  }

  // busca um agendamento pelo id. valida o id, checa existencia
  // e aplica a regra de dono pra paciente (so ve o proprio).
  async getById(id: number, user: { userId: number; role: string }) {
    const numericId = Number(id);
    if (!numericId) {
      throw { statusCode: 400, message: 'ID de agendamento inválido' };
    } else {
      if (isNaN(numericId)) {
        throw { statusCode: 400, message: 'ID de agendamento inválido' };
      }
    }

    const appt = await this.appointmentRepo.findById(numericId);
    if (!appt) {
      throw { statusCode: 404, message: 'Agendamento não encontrado' };
    }

    // se for paciente, precisa ser dono do agendamento.
    if (user.role === 'PACIENTE') {
      const patient = await this.patientRepo.findByUserId(user.userId);
      if (!patient) {
        throw { statusCode: 403, message: 'Acesso não autorizado ao agendamento' };
      } else {
        if (appt.patientId !== patient.id) {
          throw { statusCode: 403, message: 'Acesso não autorizado ao agendamento' };
        }
      }
    }

    return appt;
  }

  // cria um agendamento. e um fluxo longo porque valida varias coisas:
  // data, itens, slot (capacidade, data coerente, ativo), estoque real
  // de cada medicamento, dono do paciente (quando for paciente) ou
  // criacao de novo prontuario (quando a equipe informa cpf).
  // no fim, registra o log de auditoria.
  async create(user: { userId: number; role: string; patientId?: number | null }, data: {
    scheduledDate: string | Date;
    scheduledTime?: string;
    slotId?: number;
    patientId?: number;
    patientName?: string;
    patientCpf?: string;
    notes?: string;
    items?: Array<{ medicineId: number; quantity: number }>;
  }) {
    const { scheduledDate, scheduledTime, slotId, patientId, patientName, patientCpf, notes, items } = data;

    // data e obrigatoria e precisa ser parseavel.
    if (!scheduledDate) {
      throw { statusCode: 400, message: 'Data do agendamento é obrigatória' };
    }

    const parsedDate = new Date(scheduledDate);
    if (isNaN(parsedDate.getTime())) {
      throw { statusCode: 400, message: 'Data de agendamento inválida' };
    }

    // escala e opcional: registro avulso/presencial (dispensacao imediata)
    // nao exige horario reservado. quem quiser marcar, manda slotId.

    // precisa de pelo menos um item de medicamento.
    if (!items) {
      throw { statusCode: 400, message: 'Ao menos um medicamento deve ser adicionado ao agendamento' };
    } else {
      if (!Array.isArray(items)) {
        throw { statusCode: 400, message: 'Ao menos um medicamento deve ser adicionado ao agendamento' };
      } else {
        if (items.length === 0) {
          throw { statusCode: 400, message: 'Ao menos um medicamento deve ser adicionado ao agendamento' };
        }
      }
    }

    let numericSlotId = undefined;
    if (slotId) {
      numericSlotId = Number(slotId);
    } else {
      numericSlotId = undefined;
    }

    // se veio slot, valida capacidade, atividade e coerencia de data.
    if (numericSlotId) {
      const slot = await this.slotRepo.findById(numericSlotId);
      if (!slot) {
        throw { statusCode: 404, message: 'Horário de escala não encontrado' };
      }
      // conta consultas pending/confirmed pra saber a ocupacao atual.
      const currentCount = await prisma.appointment.count({ where: { slotId: numericSlotId, status: { in: ['PENDING', 'CONFIRMED'] } } });
      if (currentCount >= slot.maxCapacity) {
        throw { statusCode: 400, message: 'Este horário de atendimento já atingiu a capacidade máxima' };
      }
      if (!slot.active) {
        throw { statusCode: 400, message: 'Esta escala não está ativa' };
      }
      // o dia da escala precisa bater com o dia pedido (so a data, sem hora).
      const slotDate = new Date(slot.date).toISOString().slice(0, 10);
      if (slotDate !== parsedDate.toISOString().slice(0, 10)) {
        throw { statusCode: 400, message: 'A data não corresponde à escala selecionada' };
      }
    }

    // valida todos os medicamentos em paralelo (promise.all) em vez de
    // fazer uma consulta sequencial por item. cada item ainda confere
    // o estoque real disponivel (fisico menos reservado), usando agregados
    // no banco pra nao trazer linhas desnecessarias.
    await Promise.all(
      items.map(async (item) => {
        const medId = Number(item.medicineId);
        const qty = Number(item.quantity);

        if (!medId || isNaN(medId) || !qty || isNaN(qty) || qty <= 0) {
          throw { statusCode: 400, message: 'Todos os medicamentos devem ter ID válido e quantidade positiva' };
        }

        const med = await this.medicineRepo.findById(medId);
        if (!med) {
          throw { statusCode: 404, message: `Medicamento #${medId} não encontrado` };
        }

        // aqui chamamos o calculateRealAvailableStock (logo abaixo) pra
        // saber o saldo real, descontando reservas de consultas em aberto.
        const stockInfo = await this.calculateRealAvailableStock(medId);
        if (qty > stockInfo.realAvailableStock) {
          throw {
            statusCode: 400,
            message: `Estoque insuficiente para o medicamento "${med.name}". Solicitado: ${qty}, Disponível real: ${stockInfo.realAvailableStock} (Físico: ${stockInfo.physicalStockTotal}, Reservado: ${stockInfo.reservedQuantity})`,
          };
        }
        return { medId, qty };
      })
    );

    // resolve o paciente alvo dependendo de quem esta criando.
    let targetPatientId = undefined;
    if (patientId) {
      targetPatientId = Number(patientId);
    } else {
      targetPatientId = undefined;
    }

    if (user.role === 'PACIENTE') {
      // paciente so cria pra si mesmo. amarramos o patientId ao dono do token.
      const patient = await this.patientRepo.findByUserId(user.userId);
      if (!patient) {
        throw { statusCode: 404, message: 'Perfil de paciente não encontrado' };
      }
      targetPatientId = patient.id;
    } else {
      // equipe pode criar agendamento pra qualquer paciente.
      // se veio cpf, buscamos o prontuario (ou criamos um novo se
      // veio nome junto). senao, exige patientId.
      if (patientCpf) {
        const cleanCpf = patientCpf.replace(/\D/g, '');
        let patient = await this.patientRepo.findByCpf(cleanCpf);
        if (!patient) {
          if (patientName) {
            patient = await this.patientRepo.create({
              name: patientName.trim(),
              cpf: cleanCpf,
            });
          } else {
            throw { statusCode: 400, message: 'Nome do paciente é obrigatório para cadastrar novo prontuário' };
          }
        }
        targetPatientId = patient.id;
      } else {
        if (!targetPatientId) {
          throw { statusCode: 400, message: 'CPF ou ID do paciente é obrigatório' };
        }
      }
    }

    // normaliza campos de texto opcionais.
    let cleanScheduledTime = undefined;
    if (scheduledTime) {
      cleanScheduledTime = scheduledTime.trim();
    } else {
      cleanScheduledTime = undefined;
    }

    let cleanNotes = undefined;
    if (notes) {
      cleanNotes = notes.trim();
    } else {
      cleanNotes = undefined;
    }

    // chama o repositorio (/repositories/appointment-repository.ts)
    // pra criar a consulta e os itens numa transacao.
    const appointment = await this.appointmentRepo.create({
      patientId: targetPatientId,
      scheduledDate: parsedDate,
      scheduledTime: cleanScheduledTime,
      slotId: numericSlotId,
      notes: cleanNotes,
      items: items.map(i => ({ medicineId: Number(i.medicineId), quantity: Number(i.quantity) })),
    });

    // log de auditoria da criacao. se o appointment vier nulo por
    // algum motivo, o log fica sem entityId, mas ainda registra a acao.
    let appointmentLogId = null;
    if (appointment) {
      appointmentLogId = appointment.id;
    } else {
      appointmentLogId = null;
    }

    await this.logService.log(
      user.userId,
      'create',
      'appointments',
      appointmentLogId,
      `Criou agendamento de dispensação para paciente #${targetPatientId}`
    );

    return appointment;
  }

  // atualiza o status do agendamento. e aqui que mora a dispensacao:
  // quando o alvo e completed, o metodo baixa os lotes do estoque,
  // registra movimentacao e log, tudo numa transacao.
  async updateStatus(userId: number, role: string, id: number, status: string, notes?: string, batchSelections?: Array<{ medicineId: number; batchId: number; quantity: number }>) {
    const numericId = Number(id);
    if (!numericId) {
      throw { statusCode: 400, message: 'ID de agendamento inválido' };
    } else {
      if (isNaN(numericId)) {
        throw { statusCode: 400, message: 'ID de agendamento inválido' };
      }
    }

    if (!status) {
      throw { statusCode: 400, message: 'Status é obrigatório' };
    } else {
      if (!status.trim()) {
        throw { statusCode: 400, message: 'Status é obrigatório' };
      }
    }

    const appt = await this.appointmentRepo.findById(numericId);
    if (!appt) {
      throw { statusCode: 404, message: 'Agendamento não encontrado' };
    }

    const normalizedStatus = status.trim().toUpperCase();

    // regra de paciente: so cancela, e so o proprio agendamento.
    // cancelamento exige justificativa.
    if (role === 'PACIENTE') {
      const patient = await this.patientRepo.findByUserId(userId);
      if (!patient) {
        throw { statusCode: 403, message: 'Acesso não autorizado: você só pode alterar seus próprios agendamentos' };
      } else {
        if (appt.patientId !== patient.id) {
          throw { statusCode: 403, message: 'Acesso não autorizado: você só pode alterar seus próprios agendamentos' };
        }
      }
      if (normalizedStatus !== 'CANCELLED') {
        throw { statusCode: 403, message: 'Pacientes só têm permissão para cancelar seus próprios agendamentos' };
      }
      if (normalizedStatus === 'CANCELLED' && (!notes || !notes.trim())) {
        throw { statusCode: 400, message: 'A justificativa do cancelamento é obrigatória' };
      }
    }

    // mesma regra pra equipe: cancelamento tambem exige justificativa.
    if (normalizedStatus === 'CANCELLED' && (!notes || !notes.trim())) {
      throw { statusCode: 400, message: 'A justificativa do cancelamento é obrigatória' };
    }

    let cleanNotes = undefined;
    if (notes) {
      cleanNotes = notes.trim();
    } else {
      cleanNotes = undefined;
    }

    // daqui pra baixo e o caminho de dispensacao (status completed).
    // so consulta com paciente e itens pode ser dispensada.
    if (normalizedStatus === 'COMPLETED') {
      if (!appt.patient) {
        throw { statusCode: 400, message: 'O paciente do agendamento não foi encontrado' };
      }
      if (!appt.items) {
        throw { statusCode: 400, message: 'O agendamento não possui medicamentos para dispensação' };
      } else {
        if (appt.items.length === 0) {
          throw { statusCode: 400, message: 'O agendamento não possui medicamentos para dispensação' };
        }
      }

      // resolve os itens a dispensar, respeitando a selecao manual de
      // lotes (quando veio) ou caindo no automatico (fefo) mais abaixo.
      const dispenseItems = this.resolveDispenseItems(appt.items, batchSelections);

      // tudo dentro de uma transacao: ou baixa todos os lotes e marca
      // como completed, ou nada acontece.
      const updatedAppointment = await prisma.$transaction(async (tx) => {
        let firstBatchId: number | null = null;

        for (let i = 0; i < dispenseItems.length; i++) {
          const item = dispenseItems[i];
          let chosenBatchId: number | null = null;
          if (item.batchId) {
            chosenBatchId = Number(item.batchId);
          } else {
            chosenBatchId = null;
          }

          // caminho 1: o operador escolheu um lote especifico.
          // valida existencia, bloqueio, validade e saldo antes de debitar.
          if (chosenBatchId) {
            const batch = await tx.stockBatch.findUnique({
              where: { id: chosenBatchId },
            });
            if (!batch) {
              throw { statusCode: 404, message: `Lote #${chosenBatchId} não encontrado` };
            }
            if (batch.isBlocked) {
              throw { statusCode: 400, message: `Lote ${batch.batchNumber} está bloqueado para uso` };
            }
            if (new Date(batch.expirationDate).getTime() < new Date().getTime()) {
              throw { statusCode: 400, message: `Lote ${batch.batchNumber} está vencido` };
            }
            if (batch.currentQuantity < item.quantity) {
              throw { statusCode: 400, message: `Saldo insuficiente no lote ${batch.batchNumber}. Disponível: ${batch.currentQuantity}, Solicitado: ${item.quantity}` };
            }

            // baixa do lote e registra a movimentacao de dispensacao.
            await tx.stockBatch.update({
              where: { id: chosenBatchId },
              data: {
                currentQuantity: batch.currentQuantity - item.quantity,
              },
            });

            await tx.stockMovement.create({
              data: {
                batchId: chosenBatchId,
                type: 'DISPENSE',
                quantity: item.quantity,
                notes: `Dispensação agendamento #${numericId} para paciente #${appt.patientId}`,
                userId: userId,
              },
            });

            if (!firstBatchId) {
              firstBatchId = chosenBatchId;
            }

            // amarra o lote escolhido ao item da consulta.
            if (appt.items[i]) {
              await tx.appointmentItem.update({
                where: { id: appt.items[i].id },
                data: { batchId: chosenBatchId },
              });
            }
          } else {
            // caminho 2: sem lote escolhido, aplica fefo
            // (first expired, first out): pega os lotes ativos validos
            // ordenados pela validade mais proxima e vai consumindo.
            let medicineId = null;
            if (item.medicineId) {
              medicineId = item.medicineId;
            } else {
              if (appt.items[i]) {
                medicineId = appt.items[i].medicineId;
              }
            }

            if (!medicineId) {
              throw { statusCode: 400, message: 'Medicamento não identificado para dispensação' };
            }

            const activeBatches = await tx.stockBatch.findMany({
              where: {
                medicineId: medicineId,
                currentQuantity: { gt: 0 },
                isBlocked: false,
                expirationDate: { gte: new Date() },
              },
              orderBy: { expirationDate: 'asc' },
            });

            let remainingQty = item.quantity;
            let allocatedBatchId: number | null = null;

            for (let b = 0; b < activeBatches.length; b++) {
              if (remainingQty <= 0) {
                break;
              }
              const currentBatch = activeBatches[b];
              // consome o que der do lote atual (tudo ou o que falta).
              let deduct = 0;
              if (currentBatch.currentQuantity >= remainingQty) {
                deduct = remainingQty;
              } else {
                deduct = currentBatch.currentQuantity;
              }

              await tx.stockBatch.update({
                where: { id: currentBatch.id },
                data: {
                  currentQuantity: currentBatch.currentQuantity - deduct,
                },
              });

              await tx.stockMovement.create({
                data: {
                  batchId: currentBatch.id,
                  type: 'DISPENSE',
                  quantity: deduct,
                  notes: `Dispensação FEFO agendamento #${numericId} para paciente #${appt.patientId}`,
                  userId: userId,
                },
              });

              if (!allocatedBatchId) {
                allocatedBatchId = currentBatch.id;
              }
              if (!firstBatchId) {
                firstBatchId = currentBatch.id;
              }

              remainingQty = remainingQty - deduct;
            }

            // se ainda faltou saldo depois de varrer todos os lotes,
            // lanca erro (a transacao inteira desfaz).
            if (remainingQty > 0) {
              throw { statusCode: 400, message: `Estoque insuficiente para o medicamento #${medicineId}. Faltam ${remainingQty} unidade(s)` };
            }

            if (appt.items[i]) {
              await tx.appointmentItem.update({
                where: { id: appt.items[i].id },
                data: { batchId: allocatedBatchId },
              });
            }
          }
        }

        // se veio nota, sobrescreve a nota atual. senao, mantem a anterior.
        let updatedNotes = appt.notes;
        if (cleanNotes) {
          updatedNotes = cleanNotes;
        }

        // fecha a consulta: marca completed, guarda quem dispensou,
        // quando, e o primeiro lote usado (referencia rapida).
        const updated = await tx.appointment.update({
          where: { id: numericId },
          data: {
            status: 'COMPLETED',
            notes: updatedNotes,
            dispensedByUserId: userId,
            dispensedAt: new Date(),
            batchId: firstBatchId,
          },
          include: {
            patient: true,
            slot: {
              include: {
                assignedTo: { select: { id: true, name: true, role: true } },
              },
            },
            batch: {
              include: {
                medicine: true,
              },
            },
            dispensedByUser: {
              select: { id: true, name: true, role: true },
            },
            items: {
              include: {
                medicine: true,
                batch: {
                  include: {
                    medicine: true,
                  },
                },
              },
            },
          },
        });

        return updated;
      });

      // log de auditoria da dispensacao.
      await this.logService.log(
        userId,
        'update_status',
        'appointments',
        numericId,
        `Atualizou status do agendamento #${numericId} para ${normalizedStatus}`
      );

      return updatedAppointment;
    }

    // caminho comum (nao completed): so atualiza o status.
    const updated = await this.appointmentRepo.updateStatus(numericId, normalizedStatus, cleanNotes);

    await this.logService.log(
      userId,
      'update_status',
      'appointments',
      numericId,
      `Atualizou status do agendamento #${numericId} para ${normalizedStatus}`
    );

    return updated;
  }

  // atualiza os dados gerais do agendamento (data, horario, slot, notas, status).
  // paciente so pode mexer se for dono, e so pra cancelar.
  async update(userId: number, role: string, id: number, data: {
    scheduledDate?: string | Date;
    scheduledTime?: string;
    slotId?: number;
    notes?: string;
    status?: string;
  }) {
    const numericId = Number(id);
    if (!numericId) {
      throw { statusCode: 400, message: 'ID de agendamento inválido' };
    } else {
      if (isNaN(numericId)) {
        throw { statusCode: 400, message: 'ID de agendamento inválido' };
      }
    }

    const appt = await this.appointmentRepo.findById(numericId);
    if (!appt) {
      throw { statusCode: 404, message: 'Agendamento não encontrado' };
    }

    // regra de paciente: so edita o proprio, e so pra cancelar.
    if (role === 'PACIENTE') {
      const patient = await this.patientRepo.findByUserId(userId);
      if (!patient) {
        throw { statusCode: 403, message: 'Acesso não autorizado: você só pode alterar seus próprios agendamentos' };
      } else {
        if (appt.patientId !== patient.id) {
          throw { statusCode: 403, message: 'Acesso não autorizado: você só pode alterar seus próprios agendamentos' };
        }
      }
      if (data.status) {
        if (data.status.trim().toUpperCase() !== 'CANCELLED') {
          throw { statusCode: 403, message: 'Pacientes só têm permissão para cancelar seus próprios agendamentos' };
        }
      }
    }

    // monta o update so com os campos que vieram.
    const updateData: any = {};
    if (data.scheduledDate) {
      const parsedDate = new Date(data.scheduledDate);
      if (isNaN(parsedDate.getTime())) {
        throw { statusCode: 400, message: 'Data de agendamento inválida' };
      }
      updateData.scheduledDate = parsedDate;
    }

    if (data.scheduledTime !== undefined) {
      updateData.scheduledTime = data.scheduledTime.trim();
    }
    if (data.slotId !== undefined) {
      // slotId aceita null pra desvincular a escala.
      let parsedSlotId = null;
      if (data.slotId) {
        parsedSlotId = Number(data.slotId);
      } else {
        parsedSlotId = null;
      }
      updateData.slotId = parsedSlotId;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes.trim();
    }
    if (data.status) {
      updateData.status = data.status.trim().toUpperCase();
    }

    const updated = await this.appointmentRepo.update(numericId, updateData);

    await this.logService.log(
      userId,
      'update',
      'appointments',
      numericId,
      `Atualizou agendamento #${numericId}`
    );

    return updated;
  }

  // apaga um agendamento. paciente so o proprio, equipe qualquer um.
  // fica registrado no log de auditoria.
  async delete(userId: number, role: string, id: number) {
    const numericId = Number(id);
    if (!numericId) {
      throw { statusCode: 400, message: 'ID de agendamento inválido' };
    } else {
      if (isNaN(numericId)) {
        throw { statusCode: 400, message: 'ID de agendamento inválido' };
      }
    }

    const appt = await this.appointmentRepo.findById(numericId);
    if (!appt) {
      throw { statusCode: 404, message: 'Agendamento não encontrado' };
    }

    if (role === 'PACIENTE') {
      const patient = await this.patientRepo.findByUserId(userId);
      if (!patient) {
        throw { statusCode: 403, message: 'Acesso não autorizado ao agendamento' };
      } else {
        if (appt.patientId !== patient.id) {
          throw { statusCode: 403, message: 'Acesso não autorizado ao agendamento' };
        }
      }
    }

    await this.appointmentRepo.delete(numericId);

    await this.logService.log(
      userId,
      'delete',
      'appointments',
      numericId,
      `Cancelou/excluiu agendamento #${numericId}`
    );

    return { message: 'Agendamento cancelado/excluído com sucesso' };
  }

  // helper privado que resolve quais lotes serao usados na dispensacao.
  // se o operador escolheu lotes manualmente, valida se a quantidade
  // bate exatamente com os itens do agendamento. senao, devolve os itens
  // sem batchId pra o fluxo automatico (fefo) assumir.
  private resolveDispenseItems(
    appointmentItems: Array<{ medicineId: number; quantity: number }>,
    batchSelections?: Array<{ medicineId: number; batchId: number; quantity: number }>
  ): Array<{ medicineId?: number; batchId?: number; quantity: number }> {
    // sem selecao manual, so repassa os itens do agendamento.
    if (!batchSelections || batchSelections.length === 0) {
      return appointmentItems.map((item) => ({ medicineId: item.medicineId, quantity: item.quantity }));
    }

    // normaliza a selecao pra numeros.
    const normalized = batchSelections.map((s) => ({
      medicineId: Number(s.medicineId),
      batchId: Number(s.batchId),
      quantity: Number(s.quantity),
    }));

    // cada medicamento do agendamento precisa ser coberto na mesma
    // quantidade total que a selecao de lotes informou.
    for (const item of appointmentItems) {
      const total = normalized.filter((s) => s.medicineId === Number(item.medicineId)).reduce((acc, s) => acc + s.quantity, 0);
      if (total !== Number(item.quantity)) {
        throw { statusCode: 400, message: 'A quantidade dispensada por lote deve corresponder a quantidade do agendamento' };
      }
    }
    // checagem global: soma total tambem precisa bater.
    if (normalized.length !== appointmentItems.length && normalized.length > 0) {
      const expected = appointmentItems.reduce((acc, i) => acc + Number(i.quantity), 0);
      const got = normalized.reduce((acc, s) => acc + s.quantity, 0);
      if (got !== expected) {
        throw { statusCode: 400, message: 'A quantidade total dos lotes deve corresponder ao agendamento' };
      }
    }
    return normalized;
  }

  // estorna uma dispensacao: devolve os itens aos lotes de origem,
  // registra movimento de reverts e log. so admin e farmaceutico podem,
  // e a consulta precisa estar completed.
  async revertDispense(userId: number, role: string, id: number, reason: string) {
    const numericId = Number(id);
    if (!numericId) {
      throw { statusCode: 400, message: 'ID de agendamento inválido' };
    } else {
      if (isNaN(numericId)) {
        throw { statusCode: 400, message: 'ID de agendamento inválido' };
      }
    }
    // motivo e obrigatorio pra ficar rastreavel.
    let cleanReason = '';
    if (reason) {
      cleanReason = reason.trim();
    }
    if (!cleanReason) {
      throw { statusCode: 400, message: 'O motivo do estorno é obrigatório' };
    }
    // permissao: so admin e farmaceutico.
    let allowed = false;
    if (role === 'ADMIN') {
      allowed = true;
    } else {
      if (role === 'FARMACEUTICO') {
        allowed = true;
      }
    }
    if (!allowed) {
      throw { statusCode: 403, message: 'Apenas administradores e farmacêuticos podem estornar dispensações' };
    }
    const appt = await this.appointmentRepo.findById(numericId);
    if (!appt) {
      throw { statusCode: 404, message: 'Agendamento não encontrado' };
    }
    // so faz sentido estornar consulta concluida.
    if (appt.status !== 'COMPLETED') {
      throw { statusCode: 400, message: 'Somente agendamentos concluídos podem ser estornados' };
    }

    const updated = await prisma.$transaction(async (tx) => {
      // devolve cada item ao lote de origem. se o item nao tem batchId
      // proprio, cai no batchId do agendamento (referencia rapida).
      if (appt.items) {
        for (let i = 0; i < appt.items.length; i++) {
          const item = appt.items[i];
          let targetBatchId = null;
          if (item.batchId) {
            targetBatchId = item.batchId;
          } else {
            if (appt.batchId) {
              targetBatchId = appt.batchId;
            }
          }

          if (targetBatchId) {
            const batch = await tx.stockBatch.findUnique({
              where: { id: targetBatchId },
            });
            if (batch) {
              // devolve a quantidade ao lote.
              await tx.stockBatch.update({
                where: { id: targetBatchId },
                data: {
                  currentQuantity: batch.currentQuantity + item.quantity,
                },
              });

              // registra o movimento de estorno.
              await tx.stockMovement.create({
                data: {
                  batchId: targetBatchId,
                  type: 'REVERT',
                  quantity: item.quantity,
                  notes: `Estorno agendamento #${numericId}. Motivo: ${cleanReason}`,
                  userId: userId,
                },
              });
            }
          }
        }
      }

      // volta a consulta pra confirmed, limpa dados de dispensacao
      // e anota o motivo do estorno.
      return tx.appointment.update({
        where: { id: numericId },
        data: {
          status: 'CONFIRMED',
          dispensedByUserId: null,
          dispensedAt: null,
          notes: `Estornada dispensação em ${new Date().toISOString()}. Motivo: ${cleanReason}`,
        },
        include: {
          patient: true,
          slot: {
            include: {
              assignedTo: { select: { id: true, name: true, role: true } },
            },
          },
          batch: {
            include: {
              medicine: true,
            },
          },
          dispensedByUser: {
            select: { id: true, name: true, role: true },
          },
          items: {
            include: {
              medicine: true,
              batch: {
                include: {
                  medicine: true,
                },
              },
            },
          },
        },
      });
    });

    await this.logService.log(
      userId,
      'revert_dispense',
      'appointments',
      numericId,
      `Estornou dispensação do agendamento #${numericId}. Motivo: ${cleanReason}`
    );
    return updated;
  }

  // calcula o saldo real disponivel de um medicamento.
  // saldo real = estoque fisico (lotes ativos, validos e nao bloqueados)
  //              - quantidade reservada (itens de consultas pending/confirmed).
  // a ideia e nao vender pro proximo paciente o que ja foi reservado
  // por um agendamento ainda em aberto.
  async calculateRealAvailableStock(medicineId: number): Promise<{
    physicalStockTotal: number;
    reservedQuantity: number;
    realAvailableStock: number;
  }> {
    const med = await this.medicineRepo.findById(medicineId);
    if (!med) {
      throw { statusCode: 404, message: `Medicamento #${medicineId} não encontrado` };
    }

    const now = new Date();
    let physicalStockTotal = 0;

    // soma do estoque fisico. tentamos primeiro um aggregate no banco
    // (usa indices e evita trazer linhas). se por algum motivo o client
    // nao tiver aggregate (ex: mock em teste), caimos pra findmany + loop.
    try {
      const stockBatch = (prisma as any).stockBatch;
      if (stockBatch && typeof stockBatch.aggregate === 'function') {
        const agg = await stockBatch.aggregate({
          where: {
            medicineId: medicineId,
            currentQuantity: { gt: 0 },
            expirationDate: { gte: now },
            isBlocked: false,
          },
          _sum: { currentQuantity: true },
        });
        physicalStockTotal = agg._sum.currentQuantity ?? 0;
      } else if (stockBatch && typeof stockBatch.findMany === 'function') {
        const activeBatches: any[] = await stockBatch.findMany({
          where: {
            medicineId: medicineId,
            currentQuantity: { gt: 0 },
            expirationDate: { gte: now },
            isBlocked: false,
          },
        });
        for (const b of activeBatches ?? []) {
          physicalStockTotal += b.currentQuantity;
        }
      }
    } catch {
      physicalStockTotal = 0;
    }

    // fallback em memoria: se o aggregate nao deu nada, tenta achar
    // lotes ja carregados no objeto do medicamento (findbyid inclui
    // batches) ou um totalquantity caso exista. util quando o cliente
    // do banco nao suporta aggregate ou quando o dado veio junto.
    if (physicalStockTotal === 0) {
      if (med) {
        let batchesFound = false;
        if (med.batches) {
          if (Array.isArray(med.batches)) {
            if (med.batches.length > 0) {
              batchesFound = true;
              for (let b = 0; b < med.batches.length; b++) {
                const bItem = med.batches[b];
                if (!bItem.isBlocked) {
                  const expTime = new Date(bItem.expirationDate).getTime();
                  if (expTime >= now.getTime()) {
                    if (bItem.currentQuantity > 0) {
                      physicalStockTotal = physicalStockTotal + bItem.currentQuantity;
                    }
                  }
                }
              }
            }
          }
        }
        if (!batchesFound) {
          if (typeof (med as any).totalQuantity === 'number') {
            if ((med as any).totalQuantity > 0) {
              physicalStockTotal = (med as any).totalQuantity;
            }
          }
        }
      }
    }

    // soma do que esta reservado por consultas em aberto (pending/confirmed).
    // mesmo padrao do bloco acima: aggregate no banco e fallback em memoria.
    let reservedQuantity = 0;
    try {
      const appointmentItem = (prisma as any).appointmentItem;
      if (appointmentItem && typeof appointmentItem.aggregate === 'function') {
        const agg = await appointmentItem.aggregate({
          where: {
            medicineId: medicineId,
            appointment: { status: { in: ['PENDING', 'CONFIRMED'] } },
          },
          _sum: { quantity: true },
        });
        reservedQuantity = agg._sum.quantity ?? 0;
      } else if (appointmentItem && typeof appointmentItem.findMany === 'function') {
        const pendingItems = await appointmentItem.findMany({
          where: {
            medicineId: medicineId,
            appointment: { status: { in: ['PENDING', 'CONFIRMED'] } },
          },
          select: { quantity: true },
        });
        for (const p of pendingItems ?? []) {
          reservedQuantity += p.quantity;
        }
      }
    } catch {
      reservedQuantity = 0;
    }

    // saldo real e o fisico menos o reservado, nunca abaixo de zero.
    let realAvailableStock = physicalStockTotal - reservedQuantity;
    if (realAvailableStock < 0) {
      realAvailableStock = 0;
    }

    return {
      physicalStockTotal: physicalStockTotal,
      reservedQuantity: reservedQuantity,
      realAvailableStock: realAvailableStock,
    };
  }
}