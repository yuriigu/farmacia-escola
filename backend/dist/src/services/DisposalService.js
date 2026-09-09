"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisposalService = void 0;
const DisposalRepository_1 = require("../repositories/DisposalRepository");
const BatchRepository_1 = require("../repositories/BatchRepository");
const ActivityLogService_1 = require("./ActivityLogService");
class DisposalService {
    disposalRepo;
    batchRepo;
    logService;
    constructor() {
        this.disposalRepo = new DisposalRepository_1.DisposalRepository();
        this.batchRepo = new BatchRepository_1.BatchRepository();
        this.logService = new ActivityLogService_1.ActivityLogService();
    }
    async getAll() {
        return this.disposalRepo.findAll();
    }
    async getById(id) {
        const disposal = await this.disposalRepo.findById(id);
        if (!disposal) {
            throw { statusCode: 404, message: 'Descarte não encontrado' };
        }
        return disposal;
    }
    async create(userId, role, data) {
        const { batchId, quantity, reason } = data;
        if (!batchId) {
            throw { statusCode: 400, message: 'Lote e Quantidade são obrigatórios' };
        }
        else {
            if (!quantity) {
                throw { statusCode: 400, message: 'Lote e Quantidade são obrigatórios' };
            }
        }
        if (quantity <= 0) {
            throw { statusCode: 400, message: 'Quantidade deve ser maior que zero' };
        }
        const batch = await this.batchRepo.findById(batchId);
        if (!batch) {
            throw { statusCode: 404, message: 'Lote não encontrado' };
        }
        if (batch.currentQuantity < quantity) {
            throw { statusCode: 400, message: 'Quantidade de descarte maior que o saldo em estoque' };
        }
        const disposal = await this.disposalRepo.create({
            batchId,
            userId,
            quantity,
            reason,
        });
        let reasonText = 'Não informado';
        if (reason) {
            reasonText = reason;
        }
        else {
            reasonText = 'Não informado';
        }
        await this.logService.log(userId, 'create', 'disposals', disposal.id, `Registrou descarte de ${quantity} un. do lote ${batch.batchNumber}. Motivo: ${reasonText}`);
        return disposal;
    }
    async update(userId, role, id, data) {
        const disposal = await this.disposalRepo.findById(id);
        if (!disposal) {
            throw { statusCode: 404, message: 'Descarte não encontrado' };
        }
        const updated = await this.disposalRepo.update(id, data);
        await this.logService.log(userId, 'update', 'disposals', id, `Atualizou motivo do descarte #${id}`);
        return updated;
    }
    async delete(userId, role, id) {
        const disposal = await this.disposalRepo.findById(id);
        if (!disposal) {
            throw { statusCode: 404, message: 'Descarte não encontrado' };
        }
        await this.disposalRepo.delete(id);
        await this.logService.log(userId, 'delete', 'disposals', id, `Excluiu descarte #${id}`);
        return { message: 'Descarte excluído com sucesso' };
    }
    async revert(userId, role, disposalId) {
        const disposal = await this.disposalRepo.findById(disposalId);
        if (!disposal) {
            throw { statusCode: 404, message: 'Descarte não encontrado' };
        }
        const reverted = await this.disposalRepo.revert(disposalId);
        await this.logService.log(userId, 'revert', 'disposals', disposalId, `Reverteu o descarte #${disposalId}`);
        return reverted;
    }
}
exports.DisposalService = DisposalService;
