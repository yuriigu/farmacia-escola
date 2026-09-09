"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchService = void 0;
const BatchRepository_1 = require("../repositories/BatchRepository");
const MedicineRepository_1 = require("../repositories/MedicineRepository");
const ActivityLogService_1 = require("./ActivityLogService");
const StockStatusService_1 = require("./StockStatusService");
class BatchService {
    batchRepo;
    medicineRepo;
    logService;
    stockStatusService;
    constructor() {
        this.batchRepo = new BatchRepository_1.BatchRepository();
        this.medicineRepo = new MedicineRepository_1.MedicineRepository();
        this.logService = new ActivityLogService_1.ActivityLogService();
        this.stockStatusService = new StockStatusService_1.StockStatusService();
    }
    async getAll(medicineId) {
        return this.batchRepo.findAll(medicineId);
    }
    async getById(id) {
        const batch = await this.batchRepo.findById(id);
        if (!batch) {
            throw { statusCode: 404, message: 'Lote não encontrado' };
        }
        return batch;
    }
    async create(userId, role, data) {
        const { medicineId, batchNumber, currentQuantity, expirationDate, supplier } = data;
        if (!medicineId) {
            throw { statusCode: 400, message: 'Todos os campos do lote são obrigatórios' };
        }
        else {
            if (!batchNumber) {
                throw { statusCode: 400, message: 'Todos os campos do lote são obrigatórios' };
            }
            else {
                if (currentQuantity === undefined) {
                    throw { statusCode: 400, message: 'Todos os campos do lote são obrigatórios' };
                }
                else {
                    if (!expirationDate) {
                        throw { statusCode: 400, message: 'Todos os campos do lote são obrigatórios' };
                    }
                    else {
                        if (!supplier) {
                            throw { statusCode: 400, message: 'Fornecedor/origem é obrigatório' };
                        }
                    }
                }
            }
        }
        if (!supplier.trim()) {
            throw { statusCode: 400, message: 'Fornecedor/origem é obrigatório' };
        }
        const qty = Number(currentQuantity);
        if (isNaN(qty)) {
            throw { statusCode: 400, message: 'A quantidade inicial do lote deve ser um número maior ou igual a zero' };
        }
        else {
            if (qty < 0) {
                throw { statusCode: 400, message: 'A quantidade inicial do lote deve ser um número maior ou igual a zero' };
            }
        }
        const expDate = new Date(expirationDate);
        if (isNaN(expDate.getTime())) {
            throw { statusCode: 400, message: 'Data de validade inválida' };
        }
        let mfgDate = null;
        if (data.manufacturingDate) {
            const parsedMfg = new Date(data.manufacturingDate);
            if (isNaN(parsedMfg.getTime())) {
                throw { statusCode: 400, message: 'Data de fabricação inválida' };
            }
            mfgDate = parsedMfg;
        }
        else {
            mfgDate = null;
        }
        const medicine = await this.medicineRepo.findById(medicineId);
        if (!medicine) {
            throw { statusCode: 404, message: 'Medicamento não encontrado' };
        }
        let isBlockedValue = false;
        if (data.isBlocked) {
            isBlockedValue = true;
        }
        else {
            isBlockedValue = false;
        }
        let blockReasonValue = null;
        if (data.blockReason) {
            blockReasonValue = data.blockReason;
        }
        else {
            blockReasonValue = null;
        }
        const batch = await this.batchRepo.create({
            medicineId,
            batchNumber: batchNumber.trim(),
            currentQuantity: qty,
            expirationDate: expDate,
            manufacturingDate: mfgDate,
            supplier: supplier.trim(),
            isBlocked: isBlockedValue,
            blockReason: blockReasonValue,
        });
        await this.logService.log(userId, 'create', 'batches', batch.id, `Cadastrou lote ${batch.batchNumber} com quantidade ${batch.currentQuantity} e fornecedor ${batch.supplier}`);
        return batch;
    }
    async update(userId, role, id, data) {
        const batch = await this.batchRepo.findById(id);
        if (!batch) {
            throw { statusCode: 404, message: 'Lote não encontrado' };
        }
        const updateData = {};
        if (data.batchNumber !== undefined) {
            updateData.batchNumber = data.batchNumber;
        }
        if (data.supplier !== undefined) {
            updateData.supplier = data.supplier;
        }
        if (data.manufacturingDate !== undefined) {
            if (data.manufacturingDate) {
                const mfg = new Date(data.manufacturingDate);
                if (isNaN(mfg.getTime())) {
                    throw { statusCode: 400, message: 'Data de fabricação inválida' };
                }
                updateData.manufacturingDate = mfg;
            }
            else {
                updateData.manufacturingDate = null;
            }
        }
        if (data.expirationDate) {
            const expDate = new Date(data.expirationDate);
            if (isNaN(expDate.getTime())) {
                throw { statusCode: 400, message: 'Data de validade inválida' };
            }
            updateData.expirationDate = expDate;
        }
        const updated = await this.batchRepo.update(id, updateData);
        await this.logService.log(userId, 'update', 'batches', id, `Atualizou lote ${updated.batchNumber}`);
        return updated;
    }
    async adjustStock(userId, role, id, data) {
        const { newQuantity, reason } = data;
        if (newQuantity === undefined) {
            throw { statusCode: 400, message: 'Nova quantidade é obrigatória' };
        }
        else {
            if (newQuantity === null) {
                throw { statusCode: 400, message: 'Nova quantidade é obrigatória' };
            }
        }
        const qty = Number(newQuantity);
        if (isNaN(qty)) {
            throw { statusCode: 400, message: 'A quantidade deve ser um número válido' };
        }
        else {
            if (qty < 0) {
                throw { statusCode: 400, message: 'A quantidade não pode ser negativa' };
            }
        }
        if (!reason) {
            throw { statusCode: 400, message: 'A justificativa do ajuste é obrigatória' };
        }
        else {
            if (!reason.trim()) {
                throw { statusCode: 400, message: 'A justificativa do ajuste é obrigatória' };
            }
        }
        const batch = await this.batchRepo.findById(id);
        if (!batch) {
            throw { statusCode: 404, message: 'Lote não encontrado' };
        }
        const previousQuantity = batch.currentQuantity;
        const updated = await this.batchRepo.setQuantity(id, qty);
        await this.logService.log(userId, 'adjustment', 'batches', id, `Ajuste de saldo do lote ${batch.batchNumber}: de ${previousQuantity} para ${qty} un. Justificativa: ${reason.trim()}`);
        return updated;
    }
    async setBlockStatus(userId, role, id, data) {
        const { isBlocked, blockReason } = data;
        if (isBlocked === undefined) {
            throw { statusCode: 400, message: 'O status de bloqueio é obrigatório' };
        }
        else {
            if (isBlocked === null) {
                throw { statusCode: 400, message: 'O status de bloqueio é obrigatório' };
            }
        }
        if (isBlocked) {
            if (!blockReason) {
                throw { statusCode: 400, message: 'O motivo do bloqueio sanitário é obrigatório' };
            }
            else {
                if (!blockReason.trim()) {
                    throw { statusCode: 400, message: 'O motivo do bloqueio sanitário é obrigatório' };
                }
            }
        }
        const batch = await this.batchRepo.findById(id);
        if (!batch) {
            throw { statusCode: 404, message: 'Lote não encontrado' };
        }
        let finalReason = null;
        if (isBlocked) {
            if (blockReason) {
                finalReason = blockReason.trim();
            }
            else {
                finalReason = null;
            }
        }
        else {
            finalReason = null;
        }
        const updated = await this.batchRepo.setBlockStatus(id, isBlocked, finalReason);
        let actionText = '';
        let actionType = 'block';
        if (isBlocked) {
            actionType = 'block';
            actionText = `Bloqueio sanitário aplicado ao lote ${batch.batchNumber}. Motivo: ${finalReason}`;
        }
        else {
            actionType = 'unblock';
            actionText = `Desbloqueio sanitário realizado no lote ${batch.batchNumber}.`;
        }
        await this.logService.log(userId, actionType, 'batches', id, actionText);
        return updated;
    }
    async delete(userId, role, id) {
        const batch = await this.batchRepo.findById(id);
        if (!batch) {
            throw { statusCode: 404, message: 'Lote não encontrado' };
        }
        await this.batchRepo.delete(id);
        await this.logService.log(userId, 'delete', 'batches', id, `Excluiu lote ${batch.batchNumber}`);
        return { message: 'Lote excluído com sucesso' };
    }
}
exports.BatchService = BatchService;
