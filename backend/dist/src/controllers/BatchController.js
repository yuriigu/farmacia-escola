"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchController = void 0;
const BatchService_1 = require("../services/BatchService");
const Prisma_1 = require("../utils/Prisma");
const ValidationMiddleware_1 = require("../middlewares/ValidationMiddleware");
class BatchController {
    batchService;
    constructor() {
        this.batchService = new BatchService_1.BatchService();
    }
    getAll = async (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Não autenticado' });
                return;
            }
            let medicineId = undefined;
            if (req.query.medicineId) {
                medicineId = Number(req.query.medicineId);
            }
            else {
                medicineId = undefined;
            }
            const batches = await this.batchService.getAll(medicineId);
            res.json(batches);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao buscar lotes' });
                return;
            }
        }
    };
    getById = async (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Não autenticado' });
                return;
            }
            const id = Number(req.params.id);
            if (!id) {
                res.status(400).json({ error: 'ID de lote inválido' });
                return;
            }
            else {
                if (isNaN(id)) {
                    res.status(400).json({ error: 'ID de lote inválido' });
                    return;
                }
            }
            const batchRecord = await Prisma_1.prisma.stockBatch.findUnique({
                where: { id: id },
            });
            if (!batchRecord) {
                res.status(404).json({ error: 'Lote não encontrado' });
                return;
            }
            const batch = await this.batchService.getById(id);
            res.json(batch);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao buscar lote' });
                return;
            }
        }
    };
    create = async (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Não autenticado' });
                return;
            }
            const userId = req.user.userId;
            const role = req.user.role;
            let isAllowed = false;
            if (role === 'ADMIN') {
                isAllowed = true;
            }
            else {
                if (role === 'FARMACEUTICO') {
                    isAllowed = true;
                }
                else {
                    if (role === 'ALUNO') {
                        isAllowed = true;
                    }
                    else {
                        isAllowed = false;
                    }
                }
            }
            if (!isAllowed) {
                res.status(403).json({ error: 'Acesso negado para criação de lotes' });
                return;
            }
            const validationResult = ValidationMiddleware_1.batchCreateSchema.safeParse(req.body);
            if (!validationResult.success) {
                let errorMsg = 'Dados inválidos na requisição';
                if (validationResult.error) {
                    if (validationResult.error.issues) {
                        if (validationResult.error.issues.length > 0) {
                            const firstIssue = validationResult.error.issues[0];
                            if (firstIssue) {
                                if (firstIssue.message) {
                                    errorMsg = firstIssue.message;
                                }
                            }
                        }
                    }
                }
                res.status(400).json({ error: errorMsg, details: validationResult.error.issues });
                return;
            }
            const medicineRecord = await Prisma_1.prisma.medicine.findUnique({
                where: { id: validationResult.data.medicineId },
            });
            if (!medicineRecord) {
                res.status(404).json({ error: 'Medicamento não encontrado' });
                return;
            }
            const batch = await this.batchService.create(userId, role, validationResult.data);
            res.status(201).json(batch);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao cadastrar lote' });
                return;
            }
        }
    };
    update = async (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Não autenticado' });
                return;
            }
            const userId = req.user.userId;
            const role = req.user.role;
            const id = Number(req.params.id);
            if (!id) {
                res.status(400).json({ error: 'ID de lote inválido' });
                return;
            }
            else {
                if (isNaN(id)) {
                    res.status(400).json({ error: 'ID de lote inválido' });
                    return;
                }
            }
            let isAllowed = false;
            if (role === 'ADMIN') {
                isAllowed = true;
            }
            else {
                if (role === 'FARMACEUTICO') {
                    isAllowed = true;
                }
                else {
                    if (role === 'ALUNO') {
                        isAllowed = true;
                    }
                    else {
                        isAllowed = false;
                    }
                }
            }
            if (!isAllowed) {
                res.status(403).json({ error: 'Acesso negado para alteração de lotes' });
                return;
            }
            const batchRecord = await Prisma_1.prisma.stockBatch.findUnique({
                where: { id: id },
            });
            if (!batchRecord) {
                res.status(404).json({ error: 'Lote não encontrado' });
                return;
            }
            if (req.body.currentQuantity !== undefined) {
                res.status(400).json({
                    error: 'Alteração direta de saldo não é permitida. Para correções de estoque, utilize o endpoint auditado /api/batches/:id/adjustments',
                });
                return;
            }
            const validationResult = ValidationMiddleware_1.batchUpdateSchema.safeParse(req.body);
            if (!validationResult.success) {
                let errorMsg = 'Dados inválidos na requisição';
                if (validationResult.error) {
                    if (validationResult.error.issues) {
                        if (validationResult.error.issues.length > 0) {
                            const firstIssue = validationResult.error.issues[0];
                            if (firstIssue) {
                                if (firstIssue.message) {
                                    errorMsg = firstIssue.message;
                                }
                            }
                        }
                    }
                }
                res.status(400).json({ error: errorMsg, details: validationResult.error.issues });
                return;
            }
            const updated = await this.batchService.update(userId, role, id, validationResult.data);
            res.json(updated);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao atualizar lote' });
                return;
            }
        }
    };
    adjust = async (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Não autenticado' });
                return;
            }
            const userId = req.user.userId;
            const role = req.user.role;
            const id = Number(req.params.id);
            if (!id) {
                res.status(400).json({ error: 'ID de lote inválido' });
                return;
            }
            else {
                if (isNaN(id)) {
                    res.status(400).json({ error: 'ID de lote inválido' });
                    return;
                }
            }
            let isAllowed = false;
            if (role === 'ADMIN') {
                isAllowed = true;
            }
            else {
                if (role === 'FARMACEUTICO') {
                    isAllowed = true;
                }
                else {
                    isAllowed = false;
                }
            }
            if (!isAllowed) {
                res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem realizar ajustes de estoque' });
                return;
            }
            const batchRecord = await Prisma_1.prisma.stockBatch.findUnique({
                where: { id: id },
            });
            if (!batchRecord) {
                res.status(404).json({ error: 'Lote não encontrado' });
                return;
            }
            const validationResult = ValidationMiddleware_1.batchAdjustmentSchema.safeParse(req.body);
            if (!validationResult.success) {
                let errorMsg = 'Dados inválidos na requisição';
                if (validationResult.error) {
                    if (validationResult.error.issues) {
                        if (validationResult.error.issues.length > 0) {
                            const firstIssue = validationResult.error.issues[0];
                            if (firstIssue) {
                                if (firstIssue.message) {
                                    errorMsg = firstIssue.message;
                                }
                            }
                        }
                    }
                }
                res.status(400).json({ error: errorMsg, details: validationResult.error.issues });
                return;
            }
            const updated = await this.batchService.adjustStock(userId, role, id, validationResult.data);
            res.json(updated);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao ajustar estoque do lote' });
                return;
            }
        }
    };
    toggleBlock = async (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Não autenticado' });
                return;
            }
            const userId = req.user.userId;
            const role = req.user.role;
            const id = Number(req.params.id);
            if (!id) {
                res.status(400).json({ error: 'ID de lote inválido' });
                return;
            }
            else {
                if (isNaN(id)) {
                    res.status(400).json({ error: 'ID de lote inválido' });
                    return;
                }
            }
            let isAllowed = false;
            if (role === 'ADMIN') {
                isAllowed = true;
            }
            else {
                if (role === 'FARMACEUTICO') {
                    isAllowed = true;
                }
                else {
                    isAllowed = false;
                }
            }
            if (!isAllowed) {
                res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem alterar o bloqueio sanitário' });
                return;
            }
            const batchRecord = await Prisma_1.prisma.stockBatch.findUnique({
                where: { id: id },
            });
            if (!batchRecord) {
                res.status(404).json({ error: 'Lote não encontrado' });
                return;
            }
            const validationResult = ValidationMiddleware_1.batchBlockSchema.safeParse(req.body);
            if (!validationResult.success) {
                let errorMsg = 'Dados inválidos na requisição';
                if (validationResult.error) {
                    if (validationResult.error.issues) {
                        if (validationResult.error.issues.length > 0) {
                            const firstIssue = validationResult.error.issues[0];
                            if (firstIssue) {
                                if (firstIssue.message) {
                                    errorMsg = firstIssue.message;
                                }
                            }
                        }
                    }
                }
                res.status(400).json({ error: errorMsg, details: validationResult.error.issues });
                return;
            }
            const updated = await this.batchService.setBlockStatus(userId, role, id, validationResult.data);
            res.json(updated);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao alterar bloqueio sanitário do lote' });
                return;
            }
        }
    };
    delete = async (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Não autenticado' });
                return;
            }
            const userId = req.user.userId;
            const role = req.user.role;
            const id = Number(req.params.id);
            if (!id) {
                res.status(400).json({ error: 'ID de lote inválido' });
                return;
            }
            else {
                if (isNaN(id)) {
                    res.status(400).json({ error: 'ID de lote inválido' });
                    return;
                }
            }
            let isAllowed = false;
            if (role === 'ADMIN') {
                isAllowed = true;
            }
            else {
                if (role === 'FARMACEUTICO') {
                    isAllowed = true;
                }
                else {
                    isAllowed = false;
                }
            }
            if (!isAllowed) {
                res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem excluir lotes' });
                return;
            }
            const batchRecord = await Prisma_1.prisma.stockBatch.findUnique({
                where: { id: id },
            });
            if (!batchRecord) {
                res.status(404).json({ error: 'Lote não encontrado' });
                return;
            }
            const result = await this.batchService.delete(userId, role, id);
            res.json(result);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao excluir lote' });
                return;
            }
        }
    };
}
exports.BatchController = BatchController;
