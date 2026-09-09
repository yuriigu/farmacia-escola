"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawalController = void 0;
const WithdrawalService_1 = require("../services/WithdrawalService");
const Prisma_1 = require("../utils/Prisma");
const ValidationMiddleware_1 = require("../middlewares/ValidationMiddleware");
class WithdrawalController {
    withdrawalService;
    constructor() {
        this.withdrawalService = new WithdrawalService_1.WithdrawalService();
    }
    getAll = async (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Não autenticado' });
                return;
            }
            const userId = req.user.userId;
            const role = req.user.role;
            let patientId = null;
            if (role === 'PACIENTE') {
                const patientRecord = await Prisma_1.prisma.patient.findUnique({
                    where: { userId: userId },
                });
                if (!patientRecord) {
                    res.json([]);
                    return;
                }
                else {
                    patientId = patientRecord.id;
                }
            }
            const withdrawals = await this.withdrawalService.getAll(role, patientId);
            res.json(withdrawals);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao buscar dispensações' });
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
            const userId = req.user.userId;
            const role = req.user.role;
            const id = Number(req.params.id);
            if (!id) {
                res.status(400).json({ error: 'ID de dispensação inválido' });
                return;
            }
            else {
                if (isNaN(id)) {
                    res.status(400).json({ error: 'ID de dispensação inválido' });
                    return;
                }
            }
            const withdrawalRecord = await Prisma_1.prisma.withdrawal.findUnique({
                where: { id: id },
                include: {
                    patient: true,
                },
            });
            if (!withdrawalRecord) {
                res.status(404).json({ error: 'Dispensação não encontrada' });
                return;
            }
            if (role === 'PACIENTE') {
                const patientRecord = await Prisma_1.prisma.patient.findUnique({
                    where: { userId: userId },
                });
                if (!patientRecord) {
                    res.status(403).json({ error: 'Acesso não autorizado à dispensação' });
                    return;
                }
                else {
                    if (withdrawalRecord.patientId !== patientRecord.id) {
                        res.status(403).json({ error: 'Acesso não autorizado à dispensação' });
                        return;
                    }
                }
            }
            let patientId = null;
            if (role === 'PACIENTE') {
                const patientRecord = await Prisma_1.prisma.patient.findUnique({
                    where: { userId: userId },
                });
                if (patientRecord) {
                    patientId = patientRecord.id;
                }
            }
            const withdrawal = await this.withdrawalService.getById(id, role, patientId);
            res.json(withdrawal);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao buscar dispensação' });
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
            let isAllowedRole = false;
            if (role === 'ADMIN') {
                isAllowedRole = true;
            }
            else {
                if (role === 'FARMACEUTICO') {
                    isAllowedRole = true;
                }
                else {
                    if (role === 'ALUNO') {
                        isAllowedRole = true;
                    }
                    else {
                        isAllowedRole = false;
                    }
                }
            }
            if (!isAllowedRole) {
                res.status(403).json({ error: 'Acesso negado para este perfil de usuário' });
                return;
            }
            const validationResult = ValidationMiddleware_1.withdrawalCreateSchema.safeParse(req.body);
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
            const validatedData = validationResult.data;
            const withdrawal = await this.withdrawalService.create(userId, role, validatedData);
            res.status(201).json(withdrawal);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao registrar dispensação' });
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
                res.status(400).json({ error: 'ID de dispensação inválido' });
                return;
            }
            else {
                if (isNaN(id)) {
                    res.status(400).json({ error: 'ID de dispensação inválido' });
                    return;
                }
            }
            let isAllowedRole = false;
            if (role === 'ADMIN') {
                isAllowedRole = true;
            }
            else {
                if (role === 'FARMACEUTICO') {
                    isAllowedRole = true;
                }
                else {
                    if (role === 'ALUNO') {
                        isAllowedRole = true;
                    }
                    else {
                        isAllowedRole = false;
                    }
                }
            }
            if (!isAllowedRole) {
                res.status(403).json({ error: 'Acesso negado para este perfil de usuário' });
                return;
            }
            const existingRecord = await Prisma_1.prisma.withdrawal.findUnique({
                where: { id: id },
            });
            if (!existingRecord) {
                res.status(404).json({ error: 'Dispensação não encontrada' });
                return;
            }
            const validationResult = ValidationMiddleware_1.withdrawalUpdateSchema.safeParse(req.body);
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
            const updated = await this.withdrawalService.update(userId, role, id, validationResult.data);
            res.json(updated);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao atualizar dispensação' });
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
                res.status(400).json({ error: 'ID de dispensação inválido' });
                return;
            }
            else {
                if (isNaN(id)) {
                    res.status(400).json({ error: 'ID de dispensação inválido' });
                    return;
                }
            }
            let isAllowedRole = false;
            if (role === 'ADMIN') {
                isAllowedRole = true;
            }
            else {
                if (role === 'FARMACEUTICO') {
                    isAllowedRole = true;
                }
                else {
                    isAllowedRole = false;
                }
            }
            if (!isAllowedRole) {
                res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem estornar dispensações' });
                return;
            }
            const existingRecord = await Prisma_1.prisma.withdrawal.findUnique({
                where: { id: id },
            });
            if (!existingRecord) {
                res.status(404).json({ error: 'Dispensação não encontrada' });
                return;
            }
            const result = await this.withdrawalService.delete(userId, role, id);
            res.json(result);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao estornar dispensação' });
                return;
            }
        }
    };
}
exports.WithdrawalController = WithdrawalController;
