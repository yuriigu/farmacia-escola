"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleSlotController = void 0;
const ScheduleSlotService_1 = require("../services/ScheduleSlotService");
const Prisma_1 = require("../utils/Prisma");
const ValidationMiddleware_1 = require("../middlewares/ValidationMiddleware");
class ScheduleSlotController {
    slotService;
    constructor() {
        this.slotService = new ScheduleSlotService_1.ScheduleSlotService();
    }
    getAll = async (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Não autenticado' });
                return;
            }
            let startDate = undefined;
            if (req.query.startDate) {
                startDate = req.query.startDate;
            }
            else {
                startDate = undefined;
            }
            let endDate = undefined;
            if (req.query.endDate) {
                endDate = req.query.endDate;
            }
            else {
                endDate = undefined;
            }
            const slots = await this.slotService.getAll(startDate, endDate);
            res.json(slots);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao buscar escalas' });
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
                res.status(400).json({ error: 'ID de escala inválido' });
                return;
            }
            else {
                if (isNaN(id)) {
                    res.status(400).json({ error: 'ID de escala inválido' });
                    return;
                }
            }
            const slotRecord = await Prisma_1.prisma.scheduleSlot.findUnique({
                where: { id: id },
            });
            if (!slotRecord) {
                res.status(404).json({ error: 'Horário de escala não encontrado' });
                return;
            }
            const slot = await this.slotService.getById(id);
            res.json(slot);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao buscar escala' });
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
                res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem criar escalas' });
                return;
            }
            const validationResult = ValidationMiddleware_1.scheduleSlotCreateSchema.safeParse(req.body);
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
            const slot = await this.slotService.create(userId, role, validationResult.data);
            res.status(201).json(slot);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao criar escala' });
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
                res.status(400).json({ error: 'ID de escala inválido' });
                return;
            }
            else {
                if (isNaN(id)) {
                    res.status(400).json({ error: 'ID de escala inválido' });
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
                res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem atualizar escalas' });
                return;
            }
            const slotRecord = await Prisma_1.prisma.scheduleSlot.findUnique({
                where: { id: id },
            });
            if (!slotRecord) {
                res.status(404).json({ error: 'Horário de escala não encontrado' });
                return;
            }
            const validationResult = ValidationMiddleware_1.scheduleSlotUpdateSchema.safeParse(req.body);
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
            const updated = await this.slotService.update(userId, role, id, validationResult.data);
            res.json(updated);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao atualizar escala' });
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
                res.status(400).json({ error: 'ID de escala inválido' });
                return;
            }
            else {
                if (isNaN(id)) {
                    res.status(400).json({ error: 'ID de escala inválido' });
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
                res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem remover escalas' });
                return;
            }
            const slotRecord = await Prisma_1.prisma.scheduleSlot.findUnique({
                where: { id: id },
            });
            if (!slotRecord) {
                res.status(404).json({ error: 'Horário de escala não encontrado' });
                return;
            }
            const result = await this.slotService.delete(userId, role, id);
            res.json(result);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao remover escala' });
                return;
            }
        }
    };
}
exports.ScheduleSlotController = ScheduleSlotController;
