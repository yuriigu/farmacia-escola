import { prisma } from '../utils/Prisma';

export class BatchRepository {
  async findAll(medicineId?: number) {
    let where = {};
    if (medicineId) {
      where = { medicineId };
    } else {
      where = {};
    }
    return prisma.stockBatch.findMany({
      where,
      include: { medicine: true },
      orderBy: { expirationDate: 'asc' },
    });
  }

  async findById(id: number) {
    return prisma.stockBatch.findUnique({
      where: { id },
      include: { medicine: true },
    });
  }

  async create(data: {
    medicineId: number;
    batchNumber: string;
    currentQuantity: number;
    expirationDate: Date;
  }) {
    return prisma.stockBatch.create({
      data,
      include: { medicine: true },
    });
  }

  async updateQuantity(id: number, delta: number) {
    return prisma.stockBatch.update({
      where: { id },
      data: { currentQuantity: { increment: delta } },
    });
  }

  async update(
    id: number,
    data: {
      batchNumber?: string;
      currentQuantity?: number;
      expirationDate?: Date;
    }
  ) {
    return prisma.stockBatch.update({
      where: { id },
      data,
      include: { medicine: true },
    });
  }

  async delete(id: number) {
    return prisma.stockBatch.delete({ where: { id } });
  }
}