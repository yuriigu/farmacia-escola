"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchRepository = void 0;
const Prisma_1 = require("../utils/Prisma");
class BatchRepository {
    async findAll(medicineId) {
        let where = {};
        if (medicineId) {
            where = { medicineId };
        }
        else {
            where = {};
        }
        return Prisma_1.prisma.stockBatch.findMany({
            where,
            include: { medicine: true },
            orderBy: { expirationDate: 'asc' },
        });
    }
    async findById(id) {
        return Prisma_1.prisma.stockBatch.findUnique({
            where: { id },
            include: { medicine: true },
        });
    }
    async create(data) {
        return Prisma_1.prisma.stockBatch.create({
            data,
            include: { medicine: true },
        });
    }
    async updateQuantity(id, delta) {
        return Prisma_1.prisma.stockBatch.update({
            where: { id },
            data: { currentQuantity: { increment: delta } },
        });
    }
    async setQuantity(id, newQuantity) {
        return Prisma_1.prisma.stockBatch.update({
            where: { id },
            data: { currentQuantity: newQuantity },
            include: { medicine: true },
        });
    }
    async setBlockStatus(id, isBlocked, blockReason) {
        let reasonValue = null;
        if (isBlocked) {
            if (blockReason) {
                reasonValue = blockReason;
            }
            else {
                reasonValue = null;
            }
        }
        else {
            reasonValue = null;
        }
        return Prisma_1.prisma.stockBatch.update({
            where: { id },
            data: {
                isBlocked: isBlocked,
                blockReason: reasonValue,
            },
            include: { medicine: true },
        });
    }
    async update(id, data) {
        return Prisma_1.prisma.stockBatch.update({
            where: { id },
            data,
            include: { medicine: true },
        });
    }
    async delete(id) {
        return Prisma_1.prisma.stockBatch.delete({ where: { id } });
    }
}
exports.BatchRepository = BatchRepository;
