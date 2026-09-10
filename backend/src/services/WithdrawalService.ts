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
    patientName?: string;
    patientCpf?: string;
    patientId?: number;
    medicineId?: number;
    batchId?: number;
    quantity?: number;
    notes?: string;
    appointmentId?: number;
    items?: Array<{ medicineId?: number; batchId?: number; quantity: number }>;
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

    let itemsToProcess: Array<{ medicineId?: number; batchId?: number; quantity: number }> = [];

    if (data.items) {
      if (Array.isArray(data.items)) {
        if (data.items.length > 0) {
          for (let i = 0; i < data.items.length; i++) {
            const currentItem = data.items[i];
            let itemMedId = undefined;
            if (currentItem.medicineId) {
              itemMedId = Number(currentItem.medicineId);
            }
            let itemBatchId = undefined;
            if (currentItem.batchId) {
              itemBatchId = Number(currentItem.batchId);
            }
            const itemQty = Number(currentItem.quantity);
            if (isNaN(itemQty)) {
              throw { statusCode: 400, message: 'A quantidade do item deve ser maior que zero' };
            } else {
              if (itemQty <= 0) {
                throw { statusCode: 400, message: 'A quantidade do item deve ser maior que zero' };
              }
            }
            itemsToProcess.push({
              medicineId: itemMedId,
              batchId: itemBatchId,
              quantity: itemQty,
            });
          }
        }
      }
    }

    if (itemsToProcess.length === 0) {
      let singleMedId = undefined;
      if (data.medicineId) {
        singleMedId = Number(data.medicineId);
      }
      let singleBatchId = undefined;
      if (data.batchId) {
        singleBatchId = Number(data.batchId);
      }
      const singleQty = Number(data.quantity);

      if (isNaN(singleQty)) {
        throw { statusCode: 400, message: 'A quantidade deve ser maior que zero' };
      } else {
        if (singleQty <= 0) {
          throw { statusCode: 400, message: 'A quantidade deve ser maior que zero' };
        }
      }

      if (!singleBatchId) {
        if (!singleMedId) {
          throw { statusCode: 400, message: 'Lote ou medicamento é obrigatório para a dispensação' };
        }
      }

      itemsToProcess.push({
        medicineId: singleMedId,
        batchId: singleBatchId,
        quantity: singleQty,
      });
    }

    if (!cleanCpf) {
      throw { statusCode: 400, message: 'CPF do paciente, lote e quantidade são obrigatórios' };
    }

    if (cleanCpf.length !== 11) {
      throw { statusCode: 400, message: 'CPF inválido' };
    }

    const patientRecord = await this.patientRepo.findByCpf(cleanCpf);
    if (!patientRecord) {
      throw { statusCode: 404, message: 'Paciente não encontrado no cadastro' };
    }

    if (data.patientId) {
      const requestedPatientId = Number(data.patientId);
      if (requestedPatientId !== patientRecord.id) {
        throw { statusCode: 400, message: 'O paciente informado não corresponde ao CPF cadastrado' };
      }
    }

    if (itemsToProcess.length === 1) {
      const firstItem = itemsToProcess[0];
      if (firstItem.batchId) {
        const batch = await this.batchRepo.findById(firstItem.batchId);
        if (!batch) {
          throw { statusCode: 404, message: 'Lote não encontrado' };
        }
        if (batch.currentQuantity < firstItem.quantity) {
          throw { statusCode: 400, message: 'Estoque insuficiente para esta dispensação' };
        }
      }
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

    let withdrawal: any = null;
    const repoAny = this.withdrawalRepo as any;
    if (typeof repoAny.createWithFefo === 'function') {
      withdrawal = await repoAny.createWithFefo({
        patientId: patientRecord.id,
        userId: userId,
        notes: cleanNotes,
        appointmentId: parsedAppointmentId,
        items: itemsToProcess,
      });
    } else {
      const legacyItems: Array<{ batchId: number; quantity: number }> = [];
      for (let k = 0; k < itemsToProcess.length; k++) {
        let bId = 1;
        if (itemsToProcess[k].batchId) {
          bId = itemsToProcess[k].batchId as number;
        }
        legacyItems.push({
          batchId: bId,
          quantity: itemsToProcess[k].quantity,
        });
      }
      withdrawal = await this.withdrawalRepo.create({
        patientId: patientRecord.id,
        userId: userId,
        notes: cleanNotes,
        appointmentId: parsedAppointmentId,
        items: legacyItems,
      });
    }

    if (this.isAuthorizedRole(role)) {
      await this.logService.log(
        userId,
        'create',
        'withdrawals',
        withdrawal.id,
        `Dispensou medicamentos para paciente ${patientRecord.name} com baixa automática FEFO`
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

    await this.withdrawalRepo.delete(id, userId);

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

  async cancel(userId: number, role: string, id: number, cancelReason: string) {
    const withdrawal = await this.withdrawalRepo.findById(id);
    if (!withdrawal) {
      throw { statusCode: 404, message: 'Dispensação não encontrada' };
    }

    const cleanReason = cancelReason.trim();
    if (!cleanReason) {
      throw { statusCode: 400, message: 'O motivo do cancelamento é obrigatório' };
    }

    const cancelled = await this.withdrawalRepo.cancel(id, cleanReason, userId);

    return cancelled;
  }
}
