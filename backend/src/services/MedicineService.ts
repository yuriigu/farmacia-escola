import { MedicineRepository } from '../repositories/MedicineRepository';
import { ActivityLogService } from './ActivityLogService';

export class MedicineService {
  private medicineRepo: MedicineRepository;
  private logService: ActivityLogService;

  constructor() {
    this.medicineRepo = new MedicineRepository();
    this.logService = new ActivityLogService();
  }

  async getAll() {
    return this.medicineRepo.findAll();
  }

  async getById(id: number) {
    const med = await this.medicineRepo.findById(id);
    if (!med) throw { statusCode: 404, message: 'Medicamento não encontrado' };
    return med;
  }

  async create(userId: number, role: string, data: {
    name: string;
    activeIngredient?: string;
    dosage?: string;
    accessibleDesc?: string;
    category?: string;
  }) {
    if (!data.name || !data.name.trim()) {
      throw { statusCode: 400, message: 'Nome do medicamento é obrigatório' };
    }

    const medicine = await this.medicineRepo.create({
      ...data,
      name: data.name.trim(),
    });

    await this.logService.log(
      userId,
      'create',
      'medicines',
      medicine.id,
      `Cadastrou medicamento: ${medicine.name}`
    );

    return medicine;
  }

  async update(userId: number, role: string, id: number, data: {
    name?: string;
    activeIngredient?: string;
    dosage?: string;
    accessibleDesc?: string;
    category?: string;
  }) {
    const existing = await this.medicineRepo.findById(id);
    if (!existing) throw { statusCode: 404, message: 'Medicamento não encontrado' };

    if (data.name !== undefined && !data.name.trim()) {
      throw { statusCode: 400, message: 'Nome do medicamento não pode ser vazio' };
    }

    const updateData = { ...data };
    if (updateData.name) {
      updateData.name = updateData.name.trim();
    }

    const updated = await this.medicineRepo.update(id, updateData);

    await this.logService.log(
      userId,
      'update',
      'medicines',
      id,
      `Atualizou medicamento: ${updated.name}`
    );

    return updated;
  }

  async delete(userId: number, role: string, id: number) {
    const existing = await this.medicineRepo.findById(id);
    if (!existing) throw { statusCode: 404, message: 'Medicamento não encontrado' };

    const deleted = await this.medicineRepo.delete(id);

    await this.logService.log(
      userId,
      'delete',
      'medicines',
      id,
      `Excluiu medicamento: ${existing.name}`
    );

    return deleted;
  }
}