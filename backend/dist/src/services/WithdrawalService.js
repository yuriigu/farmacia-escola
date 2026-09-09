"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawalService = void 0;
const WithdrawalRepository_1 = require("../repositories/WithdrawalRepository");
const BatchRepository_1 = require("../repositories/BatchRepository");
const PatientRepository_1 = require("../repositories/PatientRepository");
const ActivityLogService_1 = require("./ActivityLogService");
class WithdrawalService {
    withdrawalRepo;
    batchRepo;
    patientRepo;
    logService;
    constructor() {
        this.withdrawalRepo = new WithdrawalRepository_1.WithdrawalRepository();
        this.batchRepo = new BatchRepository_1.BatchRepository();
        this.patientRepo = new PatientRepository_1.PatientRepository();
        this.logService = new ActivityLogService_1.ActivityLogService();
    }
    isAuthorizedRole(role) {
        if (role === 'FARMACEUTICO') {
            return true;
        }
        else {
            if (role === 'ADMIN') {
                return true;
            }
            else {
                return false;
            }
        }
    }
    sanitizeCpf(cpf) {
        return cpf.replace(/\D/g, '');
    }
    async getAll(userRole, patientId) {
        if (userRole === 'PACIENTE') {
            if (patientId) {
                return this.withdrawalRepo.findAll(patientId);
            }
        }
        return this.withdrawalRepo.findAll();
    }
    async getById(id, userRole, patientId) {
        const withdrawal = await this.withdrawalRepo.findById(id);
        if (!withdrawal) {
            throw { statusCode: 404, message: 'Dispensação não encontrada' };
        }
        if (userRole === 'PACIENTE') {
            if (withdrawal.patientId !== patientId) {
                throw { statusCode: 403, message: 'Acesso não autorizado à dispensação' };
            }
        }
        return withdrawal;
    }
    async create(userId, role, data) {
        let cleanName = '';
        if (data.patientName) {
            cleanName = data.patientName.trim();
        }
        else {
            cleanName = '';
        }
        let cleanCpf = '';
        if (data.patientCpf) {
            cleanCpf = this.sanitizeCpf(data.patientCpf);
        }
        else {
            cleanCpf = '';
        }
        let itemsToProcess = [];
        if (data.items) {
            if (Array.isArray(data.items)) {
                if (data.items.length > 0) {
                    for (let i = 0; i < data.items.length; i++) {
                        const currentItem = data.items[i];
                        let itemMedId = undefined;
                        if (currentItem.medicineId) {
                            itemMedId = Number(currentItem.medicineId);
                        }
                        let itemBatchId = undefined;
                        if (currentItem.batchId) {
                            itemBatchId = Number(currentItem.batchId);
                        }
                        const itemQty = Number(currentItem.quantity);
                        if (isNaN(itemQty)) {
                            throw { statusCode: 400, message: 'A quantidade do item deve ser maior que zero' };
                        }
                        else {
                            if (itemQty <= 0) {
                                throw { statusCode: 400, message: 'A quantidade do item deve ser maior que zero' };
                            }
                        }
                        itemsToProcess.push({
                            medicineId: itemMedId,
                            batchId: itemBatchId,
                            quantity: itemQty,
                        });
                    }
                }
            }
        }
        if (itemsToProcess.length === 0) {
            let singleMedId = undefined;
            if (data.medicineId) {
                singleMedId = Number(data.medicineId);
            }
            let singleBatchId = undefined;
            if (data.batchId) {
                singleBatchId = Number(data.batchId);
            }
            const singleQty = Number(data.quantity);
            if (isNaN(singleQty)) {
                throw { statusCode: 400, message: 'A quantidade deve ser maior que zero' };
            }
            else {
                if (singleQty <= 0) {
                    throw { statusCode: 400, message: 'A quantidade deve ser maior que zero' };
                }
            }
            if (!singleBatchId) {
                if (!singleMedId) {
                    throw { statusCode: 400, message: 'Lote ou medicamento é obrigatório para a dispensação' };
                }
            }
            itemsToProcess.push({
                medicineId: singleMedId,
                batchId: singleBatchId,
                quantity: singleQty,
            });
        }
        let targetPatientId = undefined;
        if (data.patientId) {
            targetPatientId = Number(data.patientId);
        }
        let patientRecord = null;
        if (targetPatientId) {
            patientRecord = await this.patientRepo.findById(targetPatientId);
            if (!patientRecord) {
                throw { statusCode: 404, message: 'Paciente não encontrado' };
            }
        }
        else {
            if (!cleanName) {
                throw { statusCode: 400, message: 'Nome do paciente, CPF, Lote e Quantidade são obrigatórios' };
            }
            else {
                if (!cleanCpf) {
                    throw { statusCode: 400, message: 'Nome do paciente, CPF, Lote e Quantidade são obrigatórios' };
                }
            }
            if (cleanCpf.length !== 11) {
                throw { statusCode: 400, message: 'CPF inválido' };
            }
            patientRecord = await this.patientRepo.findByCpf(cleanCpf);
            if (!patientRecord) {
                patientRecord = await this.patientRepo.create({
                    name: cleanName,
                    cpf: cleanCpf,
                });
            }
        }
        if (itemsToProcess.length === 1) {
            const firstItem = itemsToProcess[0];
            if (firstItem.batchId) {
                const batch = await this.batchRepo.findById(firstItem.batchId);
                if (!batch) {
                    throw { statusCode: 404, message: 'Lote não encontrado' };
                }
                if (batch.currentQuantity < firstItem.quantity) {
                    throw { statusCode: 400, message: 'Estoque insuficiente para esta dispensação' };
                }
            }
        }
        let cleanNotes = undefined;
        if (data.notes) {
            cleanNotes = data.notes.trim();
        }
        else {
            cleanNotes = undefined;
        }
        let parsedAppointmentId = undefined;
        if (data.appointmentId) {
            parsedAppointmentId = Number(data.appointmentId);
        }
        else {
            parsedAppointmentId = undefined;
        }
        let withdrawal = null;
        const repoAny = this.withdrawalRepo;
        if (typeof repoAny.createWithFefo === 'function') {
            withdrawal = await repoAny.createWithFefo({
                patientId: patientRecord.id,
                userId: userId,
                notes: cleanNotes,
                appointmentId: parsedAppointmentId,
                items: itemsToProcess,
            });
        }
        else {
            const legacyItems = [];
            for (let k = 0; k < itemsToProcess.length; k++) {
                let bId = 1;
                if (itemsToProcess[k].batchId) {
                    bId = itemsToProcess[k].batchId;
                }
                legacyItems.push({
                    batchId: bId,
                    quantity: itemsToProcess[k].quantity,
                });
            }
            withdrawal = await this.withdrawalRepo.create({
                patientId: patientRecord.id,
                userId: userId,
                notes: cleanNotes,
                appointmentId: parsedAppointmentId,
                items: legacyItems,
            });
        }
        if (this.isAuthorizedRole(role)) {
            await this.logService.log(userId, 'create', 'withdrawals', withdrawal.id, `Dispensou medicamentos para paciente ${patientRecord.name} com baixa automática FEFO`);
        }
        return withdrawal;
    }
    async update(userId, role, id, data) {
        const withdrawal = await this.withdrawalRepo.findById(id);
        if (!withdrawal) {
            throw { statusCode: 404, message: 'Dispensação não encontrada' };
        }
        const updateData = {};
        if (data.notes !== undefined) {
            updateData.notes = data.notes.trim();
        }
        const updated = await this.withdrawalRepo.update(id, updateData);
        if (this.isAuthorizedRole(role)) {
            await this.logService.log(userId, 'update', 'withdrawals', id, `Atualizou observações da dispensação #${id}`);
        }
        return updated;
    }
    async delete(userId, role, id) {
        const withdrawal = await this.withdrawalRepo.findById(id);
        if (!withdrawal) {
            throw { statusCode: 404, message: 'Dispensação não encontrada' };
        }
        await this.withdrawalRepo.delete(id);
        if (this.isAuthorizedRole(role)) {
            await this.logService.log(userId, 'cancel', 'withdrawals', id, `Cancelou a dispensação #${id} e estornou os itens para o estoque`);
        }
        return { message: 'Dispensação cancelada e estoque restaurado com sucesso' };
    }
}
exports.WithdrawalService = WithdrawalService;
