import { BatchRepository } from '../repositories/BatchRepository';
import { MedicineRepository } from '../repositories/MedicineRepository';
import { ActivityLogService } from './ActivityLogService';

export class BatchService {
  private batchRepo: BatchRepository;
  private medicineRepo: MedicineRepository;
  private logService: ActivityLogService;

  constructor() {
    this.batchRepo = new BatchRepository();
    this.medicineRepo = new MedicineRepository();
    this.logService = new ActivityLogService();
  }

  async getAll(medicineId?: number) {
    return this.batchRepo.findAll(medicineId);
  }

  async getById(id: number) {
    const batch = await this.batchRepo.findById(id);
    if (!batch) {
      throw { statusCode: 404, message: 'Lote não encontrado' };
    }
    return batch;
  }

  async create(userId: number, role: string, data: {
    medicineId: number;
    batchNumber: string;
    currentQuantity: number;
    expirationDate: string | Date;
  }) {
    const { medicineId, batchNumber, currentQuantity, expirationDate } = data;

    if (!medicineId) {
      throw { statusCode: 400, message: 'Todos os campos do lote são obrigatórios' };
    } else {
      if (!batchNumber) {
        throw { statusCode: 400, message: 'Todos os campos do lote são obrigatórios' };
      } else {
        if (currentQuantity === undefined) {
          throw { statusCode: 400, message: 'Todos os campos do lote são obrigatórios' };
        } else {
          if (!expirationDate) {
            throw { statusCode: 400, message: 'Todos os campos do lote são obrigatórios' };
          }
        }
      }
    }

    const qty = Number(currentQuantity);
    if (isNaN(qty)) {
      throw { statusCode: 400, message: 'A quantidade inicial do lote deve ser um número maior ou igual a zero' };
    } else {
      if (qty < 0) {
        throw { statusCode: 400, message: 'A quantidade inicial do lote deve ser um número maior ou igual a zero' };
      }
    }

    const expDate = new Date(expirationDate);
    if (isNaN(expDate.getTime())) {
      throw { statusCode: 400, message: 'Data de validade inválida' };
    }

    const medicine = await this.medicineRepo.findById(medicineId);
    if (!medicine) {
      throw { statusCode: 404, message: 'Medicamento não encontrado' };
    }

    const batch = await this.batchRepo.create({
      medicineId,
      batchNumber,
      currentQuantity: qty,
      expirationDate: expDate,
    });

    await this.logService.log(
      userId,
      'create',
      'batches',
      batch.id,
      `Cadastrou lote ${batch.batchNumber} com quantidade ${batch.currentQuantity}`
    );

    return batch;
  }

  async update(userId: number, role: string, id: number, data: {
    batchNumber?: string;
    currentQuantity?: number;
    expirationDate?: string | Date;
  }) {
    const batch = await this.batchRepo.findById(id);
    if (!batch) {
      throw { statusCode: 404, message: 'Lote não encontrado' };
    }

    const updateData: any = {};

    if (data.batchNumber !== undefined) {
      updateData.batchNumber = data.batchNumber;
    }

    if (data.currentQuantity !== undefined) {
      const qty = Number(data.currentQuantity);
      if (isNaN(qty)) {
        throw { statusCode: 400, message: 'A quantidade do lote deve ser um número maior ou igual a zero' };
      } else {
        if (qty < 0) {
          throw { statusCode: 400, message: 'A quantidade do lote deve ser um número maior ou igual a zero' };
        }
      }
      updateData.currentQuantity = qty;
    }

    if (data.expirationDate) {
      const expDate = new Date(data.expirationDate);
      if (isNaN(expDate.getTime())) {
        throw { statusCode: 400, message: 'Data de validade inválida' };
      }
      updateData.expirationDate = expDate;
    }

    const updated = await this.batchRepo.update(id, updateData);

    await this.logService.log(
      userId,
      'update',
      'batches',
      id,
      `Atualizou lote ${updated.batchNumber}`
    );

    return updated;
  }

  async delete(userId: number, role: string, id: number) {
    const batch = await this.batchRepo.findById(id);
    if (!batch) {
      throw { statusCode: 404, message: 'Lote não encontrado' };
    }

    await this.batchRepo.delete(id);

    await this.logService.log(
      userId,
      'delete',
      'batches',
      id,
      `Excluiu lote ${batch.batchNumber}`
    );

    return { message: 'Lote excluído com sucesso' };
  }
}
