"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MedicineRepository = void 0;
const Prisma_1 = require("../utils/Prisma");
class MedicineRepository {
    async findAll() {
        return Prisma_1.prisma.medicine.findMany({
            include: {
                batches: true,
            },
            orderBy: { name: 'asc' },
        });
    }
    async findById(id) {
        return Prisma_1.prisma.medicine.findUnique({
            where: { id },
            include: { batches: true },
        });
    }
    async create(data) {
        return Prisma_1.prisma.medicine.create({
            data,
            include: { batches: true },
        });
    }
    async update(id, data) {
        return Prisma_1.prisma.medicine.update({
            where: { id },
            data,
            include: { batches: true },
        });
    }
    async delete(id) {
        return Prisma_1.prisma.medicine.delete({ where: { id } });
    }
}
exports.MedicineRepository = MedicineRepository;
