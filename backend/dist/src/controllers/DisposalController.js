"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisposalController = void 0;
const DisposalService_1 = require("../services/DisposalService");
const Prisma_1 = require("../utils/Prisma");
const ValidationMiddleware_1 = require("../middlewares/ValidationMiddleware");
class DisposalController {
    disposalService;
    constructor() {
        this.disposalService = new DisposalService_1.DisposalService();
    }
    getAll = async (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Não autenticado' });
                return;
            }
            const disposals = await this.disposalService.getAll();
            res.json(disposals);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao buscar descartes' });
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
                res.status(400).json({ error: 'ID de descarte inválido' });
                return;
            }
            else {
                if (isNaN(id)) {
                    res.status(400).json({ error: 'ID de descarte inválido' });
                    return;
                }
            }
            const disposalRecord = await Prisma_1.prisma.disposal.findUnique({
                where: { id: id },
            });
            if (!disposalRecord) {
                res.status(404).json({ error: 'Descarte não encontrado' });
                return;
            }
            const disposal = await this.disposalService.getById(id);
            res.json(disposal);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao buscar descarte' });
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
                    isAllowed = false;
                }
            }
            if (!isAllowed) {
                res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem registrar descartes' });
                return;
            }
            const validationResult = ValidationMiddleware_1.disposalCreateSchema.safeParse(req.body);
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
            const batchRecord = await Prisma_1.prisma.stockBatch.findUnique({
                where: { id: validationResult.data.batchId },
            });
            if (!batchRecord) {
                res.status(404).json({ error: 'Lote não encontrado' });
                return;
            }
            if (batchRecord.currentQuantity < validationResult.data.quantity) {
                res.status(400).json({ error: 'Estoque insuficiente no lote para realizar o descarte' });
                return;
            }
            const disposal = await this.disposalService.create(userId, role, validationResult.data);
            res.status(201).json(disposal);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao registrar descarte' });
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
                res.status(400).json({ error: 'ID de descarte inválido' });
                return;
            }
            else {
                if (isNaN(id)) {
                    res.status(400).json({ error: 'ID de descarte inválido' });
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
                res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem atualizar descartes' });
                return;
            }
            const disposalRecord = await Prisma_1.prisma.disposal.findUnique({
                where: { id: id },
            });
            if (!disposalRecord) {
                res.status(404).json({ error: 'Descarte não encontrado' });
                return;
            }
            const validationResult = ValidationMiddleware_1.disposalUpdateSchema.safeParse(req.body);
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
            const updated = await this.disposalService.update(userId, role, id, validationResult.data);
            res.json(updated);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao atualizar descarte' });
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
                res.status(400).json({ error: 'ID de descarte inválido' });
                return;
            }
            else {
                if (isNaN(id)) {
                    res.status(400).json({ error: 'ID de descarte inválido' });
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
                res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem excluir descartes' });
                return;
            }
            const disposalRecord = await Prisma_1.prisma.disposal.findUnique({
                where: { id: id },
            });
            if (!disposalRecord) {
                res.status(404).json({ error: 'Descarte não encontrado' });
                return;
            }
            const result = await this.disposalService.delete(userId, role, id);
            res.json(result);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao excluir descarte' });
                return;
            }
        }
    };
    revert = async (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Não autenticado' });
                return;
            }
            const userId = req.user.userId;
            const role = req.user.role;
            const id = Number(req.params.id);
            if (!id) {
                res.status(400).json({ error: 'ID de descarte inválido' });
                return;
            }
            else {
                if (isNaN(id)) {
                    res.status(400).json({ error: 'ID de descarte inválido' });
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
                res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem reverter descartes' });
                return;
            }
            const disposalRecord = await Prisma_1.prisma.disposal.findUnique({
                where: { id: id },
            });
            if (!disposalRecord) {
                res.status(404).json({ error: 'Descarte não encontrado' });
                return;
            }
            const reverted = await this.disposalService.revert(userId, role, id);
            res.json(reverted);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao reverter descarte' });
                return;
            }
        }
    };
}
exports.DisposalController = DisposalController;
