"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientRepository = void 0;
const Prisma_1 = require("../utils/Prisma");
class PatientRepository {
    async findAll(search) {
        const where = search
            ? {
                OR: [
                    { name: { contains: search } },
                    { cpf: { contains: search } },
                ],
            }
            : {};
        return Prisma_1.prisma.patient.findMany({
            where,
            include: {
                _count: {
                    select: { withdrawals: true, appointments: true },
                },
            },
            orderBy: { name: 'asc' },
        });
    }
    async findById(id) {
        return Prisma_1.prisma.patient.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, email: true } },
                appointments: {
                    include: {
                        slot: true,
                        items: { include: { medicine: true } },
                    },
                    orderBy: { scheduledDate: 'desc' },
                },
                withdrawals: {
                    include: {
                        items: { include: { batch: { include: { medicine: true } } } },
                    },
                    orderBy: { date: 'desc' },
                },
            },
        });
    }
    async findByCpf(cpf) {
        return Prisma_1.prisma.patient.findUnique({
            where: { cpf },
        });
    }
    async findByUserId(userId) {
        return Prisma_1.prisma.patient.findUnique({
            where: { userId },
            include: {
                _count: {
                    select: { withdrawals: true, appointments: true },
                },
            },
        });
    }
    async create(data) {
        return Prisma_1.prisma.patient.create({
            data,
        });
    }
    async update(id, data) {
        return Prisma_1.prisma.patient.update({
            where: { id },
            data,
        });
    }
    async delete(id) {
        return Prisma_1.prisma.patient.delete({
            where: { id },
        });
    }
}
exports.PatientRepository = PatientRepository;
