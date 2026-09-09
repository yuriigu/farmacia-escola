"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleSlotService = void 0;
const ScheduleSlotRepository_1 = require("../repositories/ScheduleSlotRepository");
const ActivityLogService_1 = require("./ActivityLogService");
class ScheduleSlotService {
    slotRepo;
    logService;
    constructor() {
        this.slotRepo = new ScheduleSlotRepository_1.ScheduleSlotRepository();
        this.logService = new ActivityLogService_1.ActivityLogService();
    }
    async getAll(startDate, endDate) {
        let parsedStartDate;
        let parsedEndDate;
        if (startDate) {
            parsedStartDate = new Date(startDate);
            if (isNaN(parsedStartDate.getTime())) {
                throw { statusCode: 400, message: 'Data inicial inválida' };
            }
        }
        if (endDate) {
            parsedEndDate = new Date(endDate);
            if (isNaN(parsedEndDate.getTime())) {
                throw { statusCode: 400, message: 'Data final inválida' };
            }
        }
        return this.slotRepo.findAll({
            startDate: parsedStartDate,
            endDate: parsedEndDate,
        });
    }
    async getById(id) {
        const slot = await this.slotRepo.findById(id);
        if (!slot) {
            throw { statusCode: 404, message: 'Horário de escala não encontrado' };
        }
        return slot;
    }
    async create(userId, role, data) {
        const { date, timeSlot, maxCapacity, assignedToId } = data;
        let cleanTimeSlot = undefined;
        if (timeSlot) {
            cleanTimeSlot = timeSlot.trim();
        }
        else {
            cleanTimeSlot = undefined;
        }
        if (!date) {
            throw { statusCode: 400, message: 'Data e horário do slot são obrigatórios' };
        }
        else {
            if (!cleanTimeSlot) {
                throw { statusCode: 400, message: 'Data e horário do slot são obrigatórios' };
            }
        }
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            throw { statusCode: 400, message: 'Data da escala inválida' };
        }
        let parsedCapacity = 5;
        if (maxCapacity !== undefined) {
            parsedCapacity = Number(maxCapacity);
        }
        else {
            parsedCapacity = 5;
        }
        if (isNaN(parsedCapacity)) {
            throw { statusCode: 400, message: 'A capacidade máxima deve ser um número inteiro positivo' };
        }
        else {
            if (parsedCapacity <= 0) {
                throw { statusCode: 400, message: 'A capacidade máxima deve ser um número inteiro positivo' };
            }
        }
        let parsedAssignedTo = null;
        if (assignedToId) {
            parsedAssignedTo = Number(assignedToId);
        }
        else {
            parsedAssignedTo = null;
        }
        if (assignedToId) {
            if (isNaN(parsedAssignedTo)) {
                throw { statusCode: 400, message: 'ID de responsável inválido' };
            }
        }
        try {
            const slot = await this.slotRepo.create({
                date: parsedDate,
                timeSlot: cleanTimeSlot,
                maxCapacity: parsedCapacity,
                assignedToId: parsedAssignedTo,
            });
            let isStaff = false;
            if (role === 'FARMACEUTICO') {
                isStaff = true;
            }
            else {
                if (role === 'ADMIN') {
                    isStaff = true;
                }
                else {
                    isStaff = false;
                }
            }
            if (isStaff) {
                await this.logService.log(userId, 'create', 'scheduleSlots', slot.id, `Criou escala de atendimento para ${new Date(slot.date).toLocaleDateString('pt-BR')} às ${slot.timeSlot}`);
            }
            return slot;
        }
        catch (err) {
            let isUniqueConstraint = false;
            if (err.message) {
                if (err.message.includes('Unique constraint')) {
                    isUniqueConstraint = true;
                }
            }
            if (err.code === 'P2002') {
                isUniqueConstraint = true;
            }
            if (isUniqueConstraint) {
                throw { statusCode: 409, message: 'Já existe um horário cadastrado nessa mesma data e hora' };
            }
            throw err;
        }
    }
    async update(userId, role, id, data) {
        const slot = await this.slotRepo.findById(id);
        if (!slot) {
            throw { statusCode: 404, message: 'Horário de escala não encontrado' };
        }
        const updateData = {};
        if (data.date) {
            const parsedDate = new Date(data.date);
            if (isNaN(parsedDate.getTime())) {
                throw { statusCode: 400, message: 'Data da escala inválida' };
            }
            updateData.date = parsedDate;
        }
        if (data.timeSlot !== undefined) {
            const cleanTimeSlot = data.timeSlot.trim();
            if (!cleanTimeSlot) {
                throw { statusCode: 400, message: 'Horário do slot não pode ser vazio' };
            }
            updateData.timeSlot = cleanTimeSlot;
        }
        if (data.maxCapacity !== undefined) {
            const parsedCapacity = Number(data.maxCapacity);
            if (isNaN(parsedCapacity)) {
                throw { statusCode: 400, message: 'A capacidade máxima deve ser um número inteiro positivo' };
            }
            else {
                if (parsedCapacity <= 0) {
                    throw { statusCode: 400, message: 'A capacidade máxima deve ser um número inteiro positivo' };
                }
            }
            updateData.maxCapacity = parsedCapacity;
        }
        if (data.assignedToId !== undefined) {
            if (data.assignedToId === null) {
                updateData.assignedToId = null;
            }
            else {
                const parsedAssignedTo = Number(data.assignedToId);
                if (isNaN(parsedAssignedTo)) {
                    throw { statusCode: 400, message: 'ID de responsável inválido' };
                }
                updateData.assignedToId = parsedAssignedTo;
            }
        }
        try {
            const updated = await this.slotRepo.update(id, updateData);
            let isStaff = false;
            if (role === 'FARMACEUTICO') {
                isStaff = true;
            }
            else {
                if (role === 'ADMIN') {
                    isStaff = true;
                }
                else {
                    isStaff = false;
                }
            }
            if (isStaff) {
                await this.logService.log(userId, 'update', 'scheduleSlots', id, `Atualizou escala #${id}`);
            }
            return updated;
        }
        catch (err) {
            let isUniqueConstraint = false;
            if (err.message) {
                if (err.message.includes('Unique constraint')) {
                    isUniqueConstraint = true;
                }
            }
            if (err.code === 'P2002') {
                isUniqueConstraint = true;
            }
            if (isUniqueConstraint) {
                throw { statusCode: 409, message: 'Já existe um horário cadastrado nessa mesma data e hora' };
            }
            throw err;
        }
    }
    async delete(userId, role, id) {
        const slot = await this.slotRepo.findById(id);
        if (!slot) {
            throw { statusCode: 404, message: 'Horário de escala não encontrado' };
        }
        await this.slotRepo.delete(id);
        let isStaff = false;
        if (role === 'FARMACEUTICO') {
            isStaff = true;
        }
        else {
            if (role === 'ADMIN') {
                isStaff = true;
            }
            else {
                isStaff = false;
            }
        }
        if (isStaff) {
            await this.logService.log(userId, 'delete', 'scheduleSlots', id, `Removeu/desativou escala #${id}`);
        }
        return { success: true };
    }
}
exports.ScheduleSlotService = ScheduleSlotService;
