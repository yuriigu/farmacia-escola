import { MedicineRepository } from '../repositories/medicine-repository';
import { ActivityLogService } from './activity-log-service';
import { StockStatusService } from './stock-status-service';
import { StockStatus } from '../types/enums';
import { prisma } from '../utils/prisma';

export class MedicineService {
  private medicineRepo: MedicineRepository;
  private logService: ActivityLogService;
  private stockStatusService: StockStatusService;

  constructor() {
    this.medicineRepo = new MedicineRepository();
    this.logService = new ActivityLogService();
    this.stockStatusService = new StockStatusService();
  }

  async getAll() {
    const medicines = await this.medicineRepo.findAll();
    let reservedMap: Record<number, number> = {};
    try {
      if (prisma) {
        if (prisma.appointmentItem) {
          const pendingItems = await prisma.appointmentItem.findMany({
            where: {
              appointment: {
                status: {
                  in: ['PENDING', 'CONFIRMED'],
                },
              },
            },
            select: {
              medicineId: true,
              quantity: true,
            },
          });
          if (pendingItems) {
            for (let p = 0; p < pendingItems.length; p++) {
              const item = pendingItems[p];
              const mId = item.medicineId;
              let curRes = 0;
              if (reservedMap[mId]) {
                curRes = reservedMap[mId];
              }
              reservedMap[mId] = curRes + item.quantity;
            }
          }
        }
      }
    } catch {
      reservedMap = {};
    }

    const formattedMedicines = [];
    for (let i = 0; i < medicines.length; i++) {
      const med = medicines[i];
      let batchesList = [];
      if (med.batches) {
        if (Array.isArray(med.batches)) {
          batchesList = med.batches;
        }
      }

      let medMinQuantity = 0;
      if (med.minQuantity !== undefined) {
        if (med.minQuantity !== null) {
          medMinQuantity = med.minQuantity;
        }
      }

      const stockCalc = this.stockStatusService.calculateMedicineStock(batchesList, medMinQuantity);

      const formattedBatches = [];
      for (let j = 0; j < batchesList.length; j++) {
        const batch = batchesList[j];
        const batchStatus = this.stockStatusService.calculateBatchStatus(
          batch.currentQuantity,
          batch.expirationDate,
          batch.isBlocked
        );
        formattedBatches.push({
          ...batch,
          status: batchStatus,
        });
      }

      let resQty = 0;
      if (reservedMap[med.id]) {
        resQty = reservedMap[med.id];
      }
      const physicalQty = stockCalc.totalQuantity;
      let availQty = 0;
      if (physicalQty > resQty) {
        availQty = physicalQty - resQty;
      } else {
        availQty = 0;
      }

      formattedMedicines.push({
        ...med,
        batches: formattedBatches,
        totalQuantity: physicalQty,
        physicalQuantity: physicalQty,
        reservedQuantity: resQty,
        availableQuantity: availQty,
        batchesCount: stockCalc.batchesCount,
        status: stockCalc.status,
      });
    }
    return formattedMedicines;
  }

  async getById(id: number) {
    const med = await this.medicineRepo.findById(id);
    if (!med) {
      throw { statusCode: 404, message: 'Medicamento não encontrado' };
    }

    let batchesList = [];
    if (med.batches) {
      if (Array.isArray(med.batches)) {
        batchesList = med.batches;
      }
    }

    let medMinQuantity = 0;
    if (med.minQuantity !== undefined) {
      if (med.minQuantity !== null) {
        medMinQuantity = med.minQuantity;
      }
    }

    const stockCalc = this.stockStatusService.calculateMedicineStock(batchesList, medMinQuantity);

    const formattedBatches = [];
    for (let j = 0; j < batchesList.length; j++) {
      const batch = batchesList[j];
      const batchStatus = this.stockStatusService.calculateBatchStatus(
        batch.currentQuantity,
        batch.expirationDate,
        batch.isBlocked
      );
      formattedBatches.push({
        ...batch,
        status: batchStatus,
      });
    }

    let resQty = 0;
    try {
      if (prisma) {
        if (prisma.appointmentItem) {
          const pendingItems = await prisma.appointmentItem.findMany({
            where: {
              medicineId: id,
              appointment: {
                status: {
                  in: ['PENDING', 'CONFIRMED'],
                },
              },
            },
            select: {
              quantity: true,
            },
          });
          if (pendingItems) {
            for (let p = 0; p < pendingItems.length; p++) {
              resQty = resQty + pendingItems[p].quantity;
            }
          }
        }
      }
    } catch {
      resQty = 0;
    }

    const physicalQty = stockCalc.totalQuantity;
    let availQty = 0;
    if (physicalQty > resQty) {
      availQty = physicalQty - resQty;
    } else {
      availQty = 0;
    }

    return {
      ...med,
      batches: formattedBatches,
      totalQuantity: physicalQty,
      physicalQuantity: physicalQty,
      reservedQuantity: resQty,
      availableQuantity: availQty,
      batchesCount: stockCalc.batchesCount,
      status: stockCalc.status,
    };
  }

  async create(userId: number, role: string, data: {
    name: string;
    activeIngredient?: string;
    dosage?: string;
    dosageValue?: number;
    dosageUnit?: string;
    minQuantity?: number;
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

    let formattedDosage = data.dosage;
    if (data.dosageValue !== undefined) {
      if (data.dosageValue !== null) {
        if (data.dosageUnit) {
          formattedDosage = data.dosageValue + ' ' + data.dosageUnit;
        }
      }
    }

    const medicine = await this.medicineRepo.create({
      ...data,
      name: data.name.trim(),
      dosage: formattedDosage,
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
    dosageValue?: number;
    dosageUnit?: string;
    minQuantity?: number;
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

    if (data.dosageValue !== undefined) {
      if (data.dosageValue !== null) {
        if (data.dosageUnit) {
          updateData.dosage = data.dosageValue + ' ' + data.dosageUnit;
        }
      }
    }

    const updated = await this.medicineRepo.update(id, updateData);

    await this.logService.log(
      userId,
      'update',
      'medicines',
      id,
      `Atualizou medicamento: ${updated.name}`
    );

    let batchesList = [];
    if (updated.batches) {
      if (Array.isArray(updated.batches)) {
        batchesList = updated.batches;
      }
    }

    let medMinQuantity = 0;
    if (updated.minQuantity !== undefined) {
      if (updated.minQuantity !== null) {
        medMinQuantity = updated.minQuantity;
      }
    }

    const stockCalc = this.stockStatusService.calculateMedicineStock(batchesList, medMinQuantity);

    return {
      ...updated,
      totalQuantity: stockCalc.totalQuantity,
      batchesCount: stockCalc.batchesCount,
      status: stockCalc.status,
    };
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
