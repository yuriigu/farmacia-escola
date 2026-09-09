"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentRepository = void 0;
const Prisma_1 = require("../utils/Prisma");
class AppointmentRepository {
    async findAll(patientId) {
        let where = {};
        if (patientId) {
            where = { patientId };
        }
        else {
            where = {};
        }
        return Prisma_1.prisma.appointment.findMany({
            where,
            include: {
                patient: true,
                slot: {
                    include: {
                        assignedTo: { select: { id: true, name: true, role: true } },
                    },
                },
                items: {
                    include: {
                        medicine: {
                            select: {
                                id: true,
                                name: true,
                                dosage: true,
                                activeIngredient: true,
                            },
                        },
                        batch: {
                            select: {
                                id: true,
                                batchNumber: true,
                                expirationDate: true,
                            },
                        },
                    },
                },
            },
            orderBy: { scheduledDate: 'asc' },
        });
    }
    async findById(id) {
        return Prisma_1.prisma.appointment.findUnique({
            where: { id },
            include: {
                patient: true,
                slot: {
                    include: {
                        assignedTo: { select: { id: true, name: true, role: true } },
                    },
                },
                items: {
                    include: {
                        medicine: true,
                        batch: true,
                    },
                },
            },
        });
    }
    async create(data) {
        return Prisma_1.prisma.$transaction(async (tx) => {
            const created = await tx.appointment.create({
                data: {
                    patientId: data.patientId,
                    scheduledDate: data.scheduledDate,
                    scheduledTime: data.scheduledTime,
                    slotId: data.slotId,
                    notes: data.notes,
                },
                include: {
                    patient: true,
                    slot: {
                        include: {
                            assignedTo: { select: { id: true, name: true, role: true } },
                        },
                    },
                    items: {
                        include: {
                            medicine: true,
                        },
                    },
                },
            });
            for (const item of data.items) {
                await tx.appointmentItem.create({
                    data: {
                        appointmentId: created.id,
                        medicineId: item.medicineId,
                        quantity: item.quantity,
                    },
                });
            }
            return tx.appointment.findUnique({
                where: { id: created.id },
                include: {
                    patient: true,
                    slot: {
                        include: {
                            assignedTo: { select: { id: true, name: true, role: true } },
                        },
                    },
                    items: {
                        include: {
                            medicine: true,
                            batch: true,
                        },
                    },
                },
            });
        });
    }
    async updateStatus(id, status, notes) {
        const updateData = {
            status: status,
        };
        if (notes !== undefined) {
            updateData.notes = notes;
        }
        return Prisma_1.prisma.appointment.update({
            where: { id },
            data: updateData,
            include: {
                patient: true,
                slot: true,
                items: { include: { medicine: true } },
            },
        });
    }
    async update(id, data) {
        const updateData = { ...data };
        if (data.status) {
            updateData.status = data.status;
        }
        return Prisma_1.prisma.appointment.update({
            where: { id },
            data: updateData,
            include: {
                patient: true,
                slot: true,
                items: { include: { medicine: true, batch: true } },
            },
        });
    }
    async delete(id) {
        return Prisma_1.prisma.$transaction(async (tx) => {
            await tx.appointmentItem.deleteMany({
                where: { appointmentId: id },
            });
            return tx.appointment.delete({
                where: { id },
            });
        });
    }
}
exports.AppointmentRepository = AppointmentRepository;
