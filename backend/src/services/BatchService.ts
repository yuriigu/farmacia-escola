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
    if (!batch) throw { statusCode: 404, message: 'Lote não encontrado' };
    return batch;
  }

  async create(userId: number, role: string, data: {
    medicineId: number;
    batchNumber: string;
    currentQuantity: number;
    expirationDate: string | Date;
  }) {
    const { medicineId, batchNumber, currentQuantity, expirationDate } = data;

    if (!medicineId || !batchNumber || currentQuantity === undefined || !expirationDate) {
      throw { statusCode: 400, message: 'Todos os campos do lote são obrigatórios' };
    }

    const medicine = await this.medicineRepo.findById(medicineId);
    if (!medicine) {
      throw { statusCode: 404, message: 'Medicamento não encontrado' };
    }

    const batch = await this.batchRepo.create({
      medicineId,
      batchNumber,
      currentQuantity: Number(currentQuantity),
      expirationDate: new Date(expirationDate),
    });

    if (role === 'FARMACEUTICO' || role === 'ADMIN') {
      await this.logService.log(
        userId,
        'create',
        'batches',
        batch.id,
        `Cadastrou lote ${batch.batchNumber} com quantidade ${batch.currentQuantity}`
      );
    }

    return batch;
  }

  async update(userId: number, role: string, id: number, data: {
    batchNumber?: string;
    currentQuantity?: number;
    expirationDate?: string | Date;
  }) {
    const batch = await this.batchRepo.findById(id);
    if (!batch) throw { statusCode: 404, message: 'Lote não encontrado' };

    const updateData: any = {};
    if (data.batchNumber) updateData.batchNumber = data.batchNumber;
    if (data.currentQuantity !== undefined) updateData.currentQuantity = Number(data.currentQuantity);
    if (data.expirationDate) updateData.expirationDate = new Date(data.expirationDate);

    const updated = await this.batchRepo.update(id, updateData);

    if (role === 'FARMACEUTICO' || role === 'ADMIN') {
      await this.logService.log(
        userId,
        'update',
        'batches',
        id,
        `Atualizou lote ${updated.batchNumber}`
      );
    }

    return updated;
  }

  async delete(userId: number, role: string, id: number) {
    const batch = await this.batchRepo.findById(id);
    if (!batch) throw { statusCode: 404, message: 'Lote não encontrado' };

    await this.batchRepo.delete(id);

    if (role === 'FARMACEUTICO' || role === 'ADMIN') {
      await this.logService.log(
        userId,
        'delete',
        'batches',
        id,
        `Excluiu lote ${batch.batchNumber}`
      );
    }

    return { message: 'Lote excluído com sucesso' };
  }
}
