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
    const medicines = await this.medicineRepo.findAll();
    const formattedMedicines = [];
    for (let i = 0; i < medicines.length; i++) {
      const med = medicines[i];
      let totalQuantity = 0;
      let batchesCount = 0;

      if (med.batches) {
        if (Array.isArray(med.batches)) {
          batchesCount = med.batches.length;
          totalQuantity = 0;
          for (let j = 0; j < med.batches.length; j++) {
            const batch = med.batches[j];
            let isValid = true;
            if (batch.expirationDate) {
              const expTime = new Date(batch.expirationDate).getTime();
              const nowTime = new Date().getTime();
              if (expTime < nowTime) {
                isValid = false;
              } else {
                isValid = true;
              }
            } else {
              isValid = true;
            }
            if (isValid) {
              if (batch.currentQuantity) {
                if (batch.currentQuantity > 0) {
                  totalQuantity = totalQuantity + batch.currentQuantity;
                }
              }
            }
          }
        }
      }

      formattedMedicines.push({
        ...med,
        totalQuantity: totalQuantity,
        batchesCount: batchesCount,
      });
    }
    return formattedMedicines;
  }

  async getById(id: number) {
    const med = await this.medicineRepo.findById(id);
    if (!med) {
      throw { statusCode: 404, message: 'Medicamento não encontrado' };
    }

    let totalQuantity = 0;
    let batchesCount = 0;

    if (med.batches) {
      if (Array.isArray(med.batches)) {
        batchesCount = med.batches.length;
        totalQuantity = 0;
        for (let j = 0; j < med.batches.length; j++) {
          const batch = med.batches[j];
          let isValid = true;
          if (batch.expirationDate) {
            const expTime = new Date(batch.expirationDate).getTime();
            const nowTime = new Date().getTime();
            if (expTime < nowTime) {
              isValid = false;
            } else {
              isValid = true;
            }
          } else {
            isValid = true;
          }
          if (isValid) {
            if (batch.currentQuantity) {
              if (batch.currentQuantity > 0) {
                totalQuantity = totalQuantity + batch.currentQuantity;
              }
            }
          }
        }
      }
    }

    return {
      ...med,
      totalQuantity: totalQuantity,
      batchesCount: batchesCount,
    };
  }

  async create(userId: number, role: string, data: {
    name: string;
    activeIngredient?: string;
    dosage?: string;
    accessibleDesc?: string;
    category?: string;
  }) {
    if (!data.name) {
      throw { statusCode: 400, message: 'Nome do medicamento é obrigatório' };
    } else {
      if (!data.name.trim()) {
        throw { statusCode: 400, message: 'Nome do medicamento é obrigatório' };
      }
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
    if (!existing) {
      throw { statusCode: 404, message: 'Medicamento não encontrado' };
    }

    if (data.name !== undefined) {
      if (!data.name.trim()) {
        throw { statusCode: 400, message: 'Nome do medicamento não pode ser vazio' };
      }
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
    if (!existing) {
      throw { statusCode: 404, message: 'Medicamento não encontrado' };
    }

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