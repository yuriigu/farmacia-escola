"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisposalRepository = void 0;
const Prisma_1 = require("../utils/Prisma");
class DisposalRepository {
    async findAll() {
        return Prisma_1.prisma.disposal.findMany({
            include: {
                user: { select: { name: true } },
                batch: {
                    include: {
                        medicine: { select: { name: true, dosage: true } },
                    },
                },
            },
            orderBy: { date: 'desc' },
        });
    }
    async findById(id) {
        return Prisma_1.prisma.disposal.findUnique({
            where: { id },
            include: {
                user: { select: { name: true } },
                batch: {
                    include: {
                        medicine: { select: { name: true, dosage: true } },
                    },
                },
            },
        });
    }
    async create(data) {
        return Prisma_1.prisma.$transaction(async (tx) => {
            const batch = await tx.stockBatch.findUnique({
                where: { id: data.batchId },
            });
            if (!batch) {
                throw { statusCode: 404, message: 'Lote não encontrado' };
            }
            if (batch.currentQuantity < data.quantity) {
                throw { statusCode: 400, message: 'Quantidade de descarte maior que o saldo em estoque' };
            }
            const updateResult = await tx.stockBatch.updateMany({
                where: {
                    id: data.batchId,
                    currentQuantity: {
                        gte: data.quantity,
                    },
                },
                data: {
                    currentQuantity: {
                        decrement: data.quantity,
                    },
                },
            });
            if (updateResult.count === 0) {
                throw { statusCode: 400, message: 'Quantidade de descarte maior que o saldo em estoque devido à concorrência' };
            }
            const disposal = await tx.disposal.create({
                data: {
                    batchId: data.batchId,
                    userId: data.userId,
                    quantity: data.quantity,
                    reason: data.reason,
                },
                include: {
                    user: { select: { name: true } },
                    batch: {
                        include: {
                            medicine: { select: { name: true, dosage: true } },
                        },
                    },
                },
            });
            return disposal;
        });
    }
    async revert(id) {
        return Prisma_1.prisma.$transaction(async (tx) => {
            const disposal = await tx.disposal.findUnique({ where: { id } });
            if (!disposal) {
                throw new Error('Descarte não encontrado ou já revertido');
            }
            else {
                if (disposal.reverted) {
                    throw new Error('Descarte não encontrado ou já revertido');
                }
            }
            const updateDisposalResult = await tx.disposal.updateMany({
                where: {
                    id: id,
                    reverted: false,
                },
                data: {
                    reverted: true,
                },
            });
            if (updateDisposalResult.count === 0) {
                throw new Error('Descarte não encontrado ou já revertido');
            }
            const updated = await tx.disposal.findUnique({
                where: { id },
                include: {
                    user: { select: { name: true } },
                    batch: {
                        include: {
                            medicine: { select: { name: true, dosage: true } },
                        },
                    },
                },
            });
            await tx.stockBatch.update({
                where: { id: disposal.batchId },
                data: { currentQuantity: { increment: disposal.quantity } },
            });
            return updated;
        });
    }
    async update(id, data) {
        return Prisma_1.prisma.disposal.update({
            where: { id },
            data,
            include: {
                user: { select: { name: true } },
                batch: {
                    include: {
                        medicine: { select: { name: true, dosage: true } },
                    },
                },
            },
        });
    }
    async delete(id) {
        return Prisma_1.prisma.$transaction(async (tx) => {
            const disposal = await tx.disposal.findUnique({ where: { id } });
            if (!disposal) {
                throw new Error('Descarte não encontrado');
            }
            if (!disposal.reverted) {
                await tx.stockBatch.update({
                    where: { id: disposal.batchId },
                    data: { currentQuantity: { increment: disposal.quantity } },
                });
            }
            return tx.disposal.delete({ where: { id } });
        });
    }
}
exports.DisposalRepository = DisposalRepository;
