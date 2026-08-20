import { MedicineRepository } from '../repositories/MedicineRepository';
import { ActivityLogRepository } from '../repositories/ActivityLogRepository';

export class MedicineService {
  private medicineRepo: MedicineRepository;
  private logRepo: ActivityLogRepository;

  constructor() {
    this.medicineRepo = new MedicineRepository();
    this.logRepo = new ActivityLogRepository();
  }

  async listMedicines() {
    return this.medicineRepo.findAll();
  }

  async createMedicine(userId: number, data: { name: string; activeIngredient?: string; dosage?: string; accessibleDesc?: string; category?: string }) {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Nome do medicamento é obrigatório');
    }

    const medicine = await this.medicineRepo.create(data);
    await this.logRepo.createLog({
      userId,
      action: 'CRIAR_MEDICAMENTO',
      entity: 'Medicine',
      entityId: medicine.id,
      details: `Cadastrado medicamento: ${medicine.name}`,
    });

    return medicine;
  }
}