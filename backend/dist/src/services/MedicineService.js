"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MedicineService = void 0;
const MedicineRepository_1 = require("../repositories/MedicineRepository");
const ActivityLogService_1 = require("./ActivityLogService");
const StockStatusService_1 = require("./StockStatusService");
const Prisma_1 = require("../utils/Prisma");
class MedicineService {
    medicineRepo;
    logService;
    stockStatusService;
    constructor() {
        this.medicineRepo = new MedicineRepository_1.MedicineRepository();
        this.logService = new ActivityLogService_1.ActivityLogService();
        this.stockStatusService = new StockStatusService_1.StockStatusService();
    }
    async getAll() {
        const medicines = await this.medicineRepo.findAll();
        let reservedMap = {};
        try {
            if (Prisma_1.prisma && Prisma_1.prisma.appointmentItem) {
                const pendingItems = await Prisma_1.prisma.appointmentItem.findMany({
                    where: {
                        appointment: {
                            status: 'PENDING',
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
        catch {
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
            const stockCalc = this.stockStatusService.calculateMedicineStock(batchesList);
            const formattedBatches = [];
            for (let j = 0; j < batchesList.length; j++) {
                const batch = batchesList[j];
                const batchStatus = this.stockStatusService.calculateBatchStatus(batch.currentQuantity, batch.expirationDate, batch.isBlocked);
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
            }
            else {
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
    async getById(id) {
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
        const stockCalc = this.stockStatusService.calculateMedicineStock(batchesList);
        const formattedBatches = [];
        for (let j = 0; j < batchesList.length; j++) {
            const batch = batchesList[j];
            const batchStatus = this.stockStatusService.calculateBatchStatus(batch.currentQuantity, batch.expirationDate, batch.isBlocked);
            formattedBatches.push({
                ...batch,
                status: batchStatus,
            });
        }
        let resQty = 0;
        try {
            if (Prisma_1.prisma && Prisma_1.prisma.appointmentItem) {
                const pendingItems = await Prisma_1.prisma.appointmentItem.findMany({
                    where: {
                        medicineId: id,
                        appointment: {
                            status: 'PENDING',
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
        catch {
            resQty = 0;
        }
        const physicalQty = stockCalc.totalQuantity;
        let availQty = 0;
        if (physicalQty > resQty) {
            availQty = physicalQty - resQty;
        }
        else {
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
    async create(userId, role, data) {
        if (!data.name) {
            throw { statusCode: 400, message: 'Nome do medicamento é obrigatório' };
        }
        else {
            if (!data.name.trim()) {
                throw { statusCode: 400, message: 'Nome do medicamento é obrigatório' };
            }
        }
        const medicine = await this.medicineRepo.create({
            ...data,
            name: data.name.trim(),
        });
        await this.logService.log(userId, 'create', 'medicines', medicine.id, `Cadastrou medicamento: ${medicine.name}`);
        return medicine;
    }
    async update(userId, role, id, data) {
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
        await this.logService.log(userId, 'update', 'medicines', id, `Atualizou medicamento: ${updated.name}`);
        let batchesList = [];
        if (updated.batches) {
            if (Array.isArray(updated.batches)) {
                batchesList = updated.batches;
            }
        }
        const stockCalc = this.stockStatusService.calculateMedicineStock(batchesList);
        return {
            ...updated,
            totalQuantity: stockCalc.totalQuantity,
            batchesCount: stockCalc.batchesCount,
            status: stockCalc.status,
        };
    }
    async delete(userId, role, id) {
        const existing = await this.medicineRepo.findById(id);
        if (!existing) {
            throw { statusCode: 404, message: 'Medicamento não encontrado' };
        }
        const deleted = await this.medicineRepo.delete(id);
        await this.logService.log(userId, 'delete', 'medicines', id, `Excluiu medicamento: ${existing.name}`);
        return deleted;
    }
}
exports.MedicineService = MedicineService;
