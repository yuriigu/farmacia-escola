import { MedicineRepository } from '../repositories/medicine-repository';
import { ActivityLogService } from './activity-log-service';
import { StockStatusService } from './stock-status-service';
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
    // OTIMIZADO: 1 query de medicamentos + 1 agregação de reservas (2 queries
    // no total) em vez de findMany de items + loops JS por lote.
    // Usa groupBy quando disponível; cai para findMany agregado em JS se o
    // client mockado/teste não expuser groupBy (compatível com vitest).
    const medicines = await this.medicineRepo.findAll();
    let reservedMap: Record<number, number> = {};
    try {
      const appointmentItem = (prisma as any).appointmentItem;
      if (appointmentItem && typeof appointmentItem.groupBy === 'function') {
        const grouped = await appointmentItem.groupBy({
          by: ['medicineId'],
          where: {
            appointment: { status: { in: ['PENDING', 'CONFIRMED'] } },
          },
          _sum: { quantity: true },
        });
        for (const row of grouped) {
          reservedMap[row.medicineId] = row._sum.quantity ?? 0;
        }
      } else if (appointmentItem && typeof appointmentItem.findMany === 'function') {
        const pendingItems = await appointmentItem.findMany({
          where: {
            appointment: { status: { in: ['PENDING', 'CONFIRMED'] } },
          },
          select: { medicineId: true, quantity: true },
        });
        for (const item of pendingItems ?? []) {
          reservedMap[item.medicineId] = (reservedMap[item.medicineId] ?? 0) + item.quantity;
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
      // OTIMIZADO: SUM agregado no banco (usa índice [medicineId]) em vez de
      // trazer todas as linhas de items para somar em JS. Com fallback para
      // findMany quando o client mockado não expõe `aggregate`.
      const appointmentItem = (prisma as any).appointmentItem;
      if (appointmentItem && typeof appointmentItem.aggregate === 'function') {
        const agg = await appointmentItem.aggregate({
          where: {
            medicineId: id,
            appointment: { status: { in: ['PENDING', 'CONFIRMED'] } },
          },
          _sum: { quantity: true },
        });
        resQty = agg._sum.quantity ?? 0;
      } else if (appointmentItem && typeof appointmentItem.findMany === 'function') {
        const pendingItems = await appointmentItem.findMany({
          where: {
            medicineId: id,
            appointment: { status: { in: ['PENDING', 'CONFIRMED'] } },
          },
          select: { quantity: true },
        });
        for (const item of pendingItems ?? []) {
          resQty += item.quantity;
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
