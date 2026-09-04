import { WithdrawalRepository } from '../repositories/WithdrawalRepository';
import { BatchRepository } from '../repositories/BatchRepository';
import { PatientRepository } from '../repositories/PatientRepository';
import { ActivityLogService } from './ActivityLogService';

export class WithdrawalService {
  private withdrawalRepo: WithdrawalRepository;
  private batchRepo: BatchRepository;
  private patientRepo: PatientRepository;
  private logService: ActivityLogService;

  constructor() {
    this.withdrawalRepo = new WithdrawalRepository();
    this.batchRepo = new BatchRepository();
    this.patientRepo = new PatientRepository();
    this.logService = new ActivityLogService();
  }

  private isAuthorizedRole(role: string): boolean {
    if (role === 'FARMACEUTICO') {
      return true;
    } else {
      if (role === 'ADMIN') {
        return true;
      } else {
        return false;
      }
    }
  }

  private sanitizeCpf(cpf: string): string {
    return cpf.replace(/\D/g, '');
  }

  async getAll(userRole: string, patientId?: number | null) {
    if (userRole === 'PACIENTE') {
      if (patientId) {
        return this.withdrawalRepo.findAll(patientId);
      }
    }
    return this.withdrawalRepo.findAll();
  }

  async getById(id: number, userRole: string, patientId?: number | null) {
    const withdrawal = await this.withdrawalRepo.findById(id);
    if (!withdrawal) {
      throw { statusCode: 404, message: 'Dispensação não encontrada' };
    }

    if (userRole === 'PACIENTE') {
      if (withdrawal.patientId !== patientId) {
        throw { statusCode: 403, message: 'Acesso não autorizado à dispensação' };
      }
    }

    return withdrawal;
  }

  async create(userId: number, role: string, data: {
    patientName: string;
    patientCpf: string;
    batchId: number;
    quantity: number;
    notes?: string;
    appointmentId?: number;
  }) {
    let cleanName = '';
    if (data.patientName) {
      cleanName = data.patientName.trim();
    } else {
      cleanName = '';
    }

    let cleanCpf = '';
    if (data.patientCpf) {
      cleanCpf = this.sanitizeCpf(data.patientCpf);
    } else {
      cleanCpf = '';
    }

    const parsedBatchId = Number(data.batchId);
    const parsedQuantity = Number(data.quantity);

    if (!cleanName) {
      throw { statusCode: 400, message: 'Nome do paciente, CPF, Lote e Quantidade são obrigatórios' };
    } else {
      if (!cleanCpf) {
        throw { statusCode: 400, message: 'Nome do paciente, CPF, Lote e Quantidade são obrigatórios' };
      } else {
        if (!parsedBatchId) {
          throw { statusCode: 400, message: 'Nome do paciente, CPF, Lote e Quantidade são obrigatórios' };
        } else {
          if (!parsedQuantity) {
            throw { statusCode: 400, message: 'Nome do paciente, CPF, Lote e Quantidade são obrigatórios' };
          }
        }
      }
    }

    if (cleanCpf.length !== 11) {
      throw { statusCode: 400, message: 'CPF inválido' };
    }

    if (isNaN(parsedQuantity)) {
      throw { statusCode: 400, message: 'A quantidade deve ser maior que zero' };
    } else {
      if (parsedQuantity <= 0) {
        throw { statusCode: 400, message: 'A quantidade deve ser maior que zero' };
      }
    }

    const batch = await this.batchRepo.findById(parsedBatchId);
    if (!batch) {
      throw { statusCode: 404, message: 'Lote não encontrado' };
    }

    if (batch.currentQuantity < parsedQuantity) {
      throw { statusCode: 400, message: 'Estoque insuficiente para esta dispensação' };
    }

    let patient = await this.patientRepo.findByCpf(cleanCpf);
    if (!patient) {
      patient = await this.patientRepo.create({
        name: cleanName,
        cpf: cleanCpf,
      });
    }

    let cleanNotes = undefined;
    if (data.notes) {
      cleanNotes = data.notes.trim();
    } else {
      cleanNotes = undefined;
    }

    let parsedAppointmentId = undefined;
    if (data.appointmentId) {
      parsedAppointmentId = Number(data.appointmentId);
    } else {
      parsedAppointmentId = undefined;
    }

    const withdrawal = await this.withdrawalRepo.create({
      patientId: patient.id,
      userId,
      notes: cleanNotes,
      appointmentId: parsedAppointmentId,
      items: [{ batchId: parsedBatchId, quantity: parsedQuantity }],
    });

    if (this.isAuthorizedRole(role)) {
      await this.logService.log(
        userId,
        'create',
        'withdrawals',
        withdrawal.id,
        `Dispensou ${parsedQuantity} unidade(s) do lote ${batch.batchNumber} para ${patient.name}`
      );
    }

    return withdrawal;
  }

  async update(userId: number, role: string, id: number, data: { notes?: string }) {
    const withdrawal = await this.withdrawalRepo.findById(id);
    if (!withdrawal) {
      throw { statusCode: 404, message: 'Dispensação não encontrada' };
    }

    const updateData: { notes?: string } = {};
    if (data.notes !== undefined) {
      updateData.notes = data.notes.trim();
    }

    const updated = await this.withdrawalRepo.update(id, updateData);

    if (this.isAuthorizedRole(role)) {
      await this.logService.log(
        userId,
        'update',
        'withdrawals',
        id,
        `Atualizou observações da dispensação #${id}`
      );
    }

    return updated;
  }

  async delete(userId: number, role: string, id: number) {
    const withdrawal = await this.withdrawalRepo.findById(id);
    if (!withdrawal) {
      throw { statusCode: 404, message: 'Dispensação não encontrada' };
    }

    await this.withdrawalRepo.delete(id);

    if (this.isAuthorizedRole(role)) {
      await this.logService.log(
        userId,
        'cancel',
        'withdrawals',
        id,
        `Cancelou a dispensação #${id} e estornou os itens para o estoque`
      );
    }

    return { message: 'Dispensação cancelada e estoque restaurado com sucesso' };
  }
}
