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
}
