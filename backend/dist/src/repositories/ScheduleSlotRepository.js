"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleSlotRepository = void 0;
const Prisma_1 = require("../utils/Prisma");
class ScheduleSlotRepository {
    async findAll(filters) {
        const where = { active: true };
        if (filters?.startDate && filters?.endDate) {
            where.date = { gte: filters.startDate, lte: filters.endDate };
        }
        else if (filters?.startDate) {
            where.date = { gte: filters.startDate };
        }
        const slots = await Prisma_1.prisma.scheduleSlot.findMany({
            where,
            include: {
                assignedTo: { select: { id: true, name: true, role: true } },
                appointments: { where: { status: 'PENDING' } },
            },
            orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
        });
        return slots.map((slot) => ({
            ...slot,
            _count: { appointments: slot.appointments.length },
        }));
    }
    async findById(id) {
        return Prisma_1.prisma.scheduleSlot.findUnique({
            where: { id },
            include: {
                assignedTo: { select: { id: true, name: true, role: true } },
                appointments: true,
            },
        });
    }
    async create(data) {
        return Prisma_1.prisma.scheduleSlot.create({
            data: {
                date: data.date,
                timeSlot: data.timeSlot,
                maxCapacity: data.maxCapacity ?? 5,
                assignedToId: data.assignedToId ?? null,
            },
            include: {
                assignedTo: { select: { id: true, name: true, role: true } },
            },
        });
    }
    async update(id, data) {
        return Prisma_1.prisma.scheduleSlot.update({
            where: { id },
            data,
            include: {
                assignedTo: { select: { id: true, name: true, role: true } },
            },
        });
    }
    async delete(id) {
        return Prisma_1.prisma.scheduleSlot.update({
            where: { id },
            data: { active: false },
        });
    }
}
exports.ScheduleSlotRepository = ScheduleSlotRepository;
