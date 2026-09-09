"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentController = void 0;
const AppointmentService_1 = require("../services/AppointmentService");
const Prisma_1 = require("../utils/Prisma");
const ValidationMiddleware_1 = require("../middlewares/ValidationMiddleware");
class AppointmentController {
    appointmentService;
    constructor() {
        this.appointmentService = new AppointmentService_1.AppointmentService();
    }
    getAll = async (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Não autenticado' });
                return;
            }
            const userId = req.user.userId;
            const role = req.user.role;
            let patientId = undefined;
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
            const appointments = await this.appointmentService.getAll(role, userId, patientId);
            res.json(appointments);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao buscar agendamentos' });
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
                res.status(400).json({ error: 'ID de agendamento inválido' });
                return;
            }
            else {
                if (isNaN(id)) {
                    res.status(400).json({ error: 'ID de agendamento inválido' });
                    return;
                }
            }
            const appointmentRecord = await Prisma_1.prisma.appointment.findUnique({
                where: { id: id },
                include: {
                    patient: true,
                },
            });
            if (!appointmentRecord) {
                res.status(404).json({ error: 'Agendamento não encontrado' });
                return;
            }
            if (role === 'PACIENTE') {
                const patientRecord = await Prisma_1.prisma.patient.findUnique({
                    where: { userId: userId },
                });
                if (!patientRecord) {
                    res.status(403).json({ error: 'Acesso não autorizado ao agendamento' });
                    return;
                }
                else {
                    if (appointmentRecord.patientId !== patientRecord.id) {
                        res.status(403).json({ error: 'Acesso não autorizado ao agendamento de outro paciente' });
                        return;
                    }
                }
            }
            const appointment = await this.appointmentService.getById(id, req.user);
            res.json(appointment);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao buscar agendamento' });
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
            const validationResult = ValidationMiddleware_1.appointmentCreateSchema.safeParse(req.body);
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
            const payload = { ...validationResult.data };
            if (role === 'PACIENTE') {
                const patientRecord = await Prisma_1.prisma.patient.findUnique({
                    where: { userId: userId },
                });
                if (!patientRecord) {
                    res.status(400).json({ error: 'Perfil de paciente não encontrado para este usuário' });
                    return;
                }
                else {
                    payload.patientId = patientRecord.id;
                    payload.patientName = patientRecord.name;
                    payload.patientCpf = patientRecord.cpf;
                }
            }
            const appointment = await this.appointmentService.create(req.user, payload);
            res.status(201).json(appointment);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao criar agendamento' });
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
                res.status(400).json({ error: 'ID de agendamento inválido' });
                return;
            }
            else {
                if (isNaN(id)) {
                    res.status(400).json({ error: 'ID de agendamento inválido' });
                    return;
                }
            }
            const appointmentRecord = await Prisma_1.prisma.appointment.findUnique({
                where: { id: id },
            });
            if (!appointmentRecord) {
                res.status(404).json({ error: 'Agendamento não encontrado' });
                return;
            }
            if (role === 'PACIENTE') {
                const patientRecord = await Prisma_1.prisma.patient.findUnique({
                    where: { userId: userId },
                });
                if (!patientRecord) {
                    res.status(403).json({ error: 'Acesso não autorizado ao agendamento' });
                    return;
                }
                else {
                    if (appointmentRecord.patientId !== patientRecord.id) {
                        res.status(403).json({ error: 'Acesso não autorizado ao agendamento de outro paciente' });
                        return;
                    }
                }
            }
            const currentStatus = appointmentRecord.status;
            if (currentStatus === 'CANCELLED') {
                res.status(400).json({ error: 'Agendamento cancelado não pode ter seus dados ou status modificados' });
                return;
            }
            else {
                if (currentStatus === 'COMPLETED') {
                    res.status(400).json({ error: 'Agendamento já finalizado não pode ter seus dados ou status modificados' });
                    return;
                }
            }
            const validationResult = ValidationMiddleware_1.appointmentUpdateSchema.safeParse(req.body);
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
            if (validationResult.data.status) {
                const targetStatus = validationResult.data.status.toUpperCase();
                if (currentStatus !== targetStatus) {
                    if (currentStatus === 'PENDING') {
                        let isValid = false;
                        if (targetStatus === 'CONFIRMED') {
                            isValid = true;
                        }
                        else {
                            if (targetStatus === 'CANCELLED') {
                                isValid = true;
                            }
                            else {
                                isValid = false;
                            }
                        }
                        if (!isValid) {
                            res.status(400).json({ error: 'Transição de status inválida: agendamento pendente só pode ser confirmado ou cancelado' });
                            return;
                        }
                    }
                    else {
                        if (currentStatus === 'CONFIRMED') {
                            let isValid = false;
                            if (targetStatus === 'COMPLETED') {
                                isValid = true;
                            }
                            else {
                                if (targetStatus === 'CANCELLED') {
                                    isValid = true;
                                }
                                else {
                                    isValid = false;
                                }
                            }
                            if (!isValid) {
                                res.status(400).json({ error: 'Transição de status inválida: agendamento confirmado só pode ser finalizado ou cancelado' });
                                return;
                            }
                        }
                    }
                }
                if (role === 'PACIENTE') {
                    if (targetStatus !== 'CANCELLED') {
                        res.status(403).json({ error: 'Pacientes só têm permissão para cancelar seus próprios agendamentos' });
                        return;
                    }
                }
            }
            const updated = await this.appointmentService.update(userId, role, id, validationResult.data);
            res.json(updated);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao atualizar agendamento' });
                return;
            }
        }
    };
    updateStatus = async (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Não autenticado' });
                return;
            }
            const userId = req.user.userId;
            const role = req.user.role;
            const id = Number(req.params.id);
            if (!id) {
                res.status(400).json({ error: 'ID de agendamento inválido' });
                return;
            }
            else {
                if (isNaN(id)) {
                    res.status(400).json({ error: 'ID de agendamento inválido' });
                    return;
                }
            }
            const appointmentRecord = await Prisma_1.prisma.appointment.findUnique({
                where: { id: id },
            });
            if (!appointmentRecord) {
                res.status(404).json({ error: 'Agendamento não encontrado' });
                return;
            }
            if (role === 'PACIENTE') {
                const patientRecord = await Prisma_1.prisma.patient.findUnique({
                    where: { userId: userId },
                });
                if (!patientRecord) {
                    res.status(403).json({ error: 'Acesso não autorizado ao agendamento' });
                    return;
                }
                else {
                    if (appointmentRecord.patientId !== patientRecord.id) {
                        res.status(403).json({ error: 'Acesso não autorizado ao agendamento de outro paciente' });
                        return;
                    }
                }
            }
            const validationResult = ValidationMiddleware_1.appointmentUpdateStatusSchema.safeParse(req.body);
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
            const currentStatus = appointmentRecord.status;
            const targetStatus = validationResult.data.status.toUpperCase();
            if (currentStatus === 'CANCELLED') {
                res.status(400).json({ error: 'Transição inválida: um agendamento cancelado não pode voltar a nenhum outro status' });
                return;
            }
            else {
                if (currentStatus === 'COMPLETED') {
                    res.status(400).json({ error: 'Transição inválida: um agendamento finalizado não pode ter seu status modificado' });
                    return;
                }
            }
            if (currentStatus !== targetStatus) {
                if (currentStatus === 'PENDING') {
                    let isValid = false;
                    if (targetStatus === 'CONFIRMED') {
                        isValid = true;
                    }
                    else {
                        if (targetStatus === 'CANCELLED') {
                            isValid = true;
                        }
                        else {
                            isValid = false;
                        }
                    }
                    if (!isValid) {
                        res.status(400).json({ error: 'Transição de status inválida: agendamento pendente só pode ir para confirmado ou cancelado' });
                        return;
                    }
                }
                else {
                    if (currentStatus === 'CONFIRMED') {
                        let isValid = false;
                        if (targetStatus === 'COMPLETED') {
                            isValid = true;
                        }
                        else {
                            if (targetStatus === 'CANCELLED') {
                                isValid = true;
                            }
                            else {
                                isValid = false;
                            }
                        }
                        if (!isValid) {
                            res.status(400).json({ error: 'Transição de status inválida: agendamento confirmado só pode ir para finalizado ou cancelado' });
                            return;
                        }
                    }
                    else {
                        res.status(400).json({ error: 'Transição inválida a partir do status atual' });
                        return;
                    }
                }
            }
            if (role === 'PACIENTE') {
                if (targetStatus !== 'CANCELLED') {
                    res.status(403).json({ error: 'Pacientes só têm permissão para cancelar seus próprios agendamentos' });
                    return;
                }
            }
            const updated = await this.appointmentService.updateStatus(userId, role, id, targetStatus, validationResult.data.notes);
            res.json(updated);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao atualizar status do agendamento' });
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
                res.status(400).json({ error: 'ID de agendamento inválido' });
                return;
            }
            else {
                if (isNaN(id)) {
                    res.status(400).json({ error: 'ID de agendamento inválido' });
                    return;
                }
            }
            const appointmentRecord = await Prisma_1.prisma.appointment.findUnique({
                where: { id: id },
            });
            if (!appointmentRecord) {
                res.status(404).json({ error: 'Agendamento não encontrado' });
                return;
            }
            if (role === 'PACIENTE') {
                const patientRecord = await Prisma_1.prisma.patient.findUnique({
                    where: { userId: userId },
                });
                if (!patientRecord) {
                    res.status(403).json({ error: 'Acesso não autorizado ao agendamento' });
                    return;
                }
                else {
                    if (appointmentRecord.patientId !== patientRecord.id) {
                        res.status(403).json({ error: 'Acesso não autorizado ao agendamento de outro paciente' });
                        return;
                    }
                }
            }
            const result = await this.appointmentService.delete(userId, role, id);
            res.json(result);
            return;
        }
        catch (err) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            else {
                res.status(500).json({ error: 'Erro ao cancelar/excluir agendamento' });
                return;
            }
        }
    };
}
exports.AppointmentController = AppointmentController;
