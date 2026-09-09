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
    manufacturingDate?: Date | null;
    supplier: string;
    isBlocked?: boolean;
    blockReason?: string | null;
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

  async setQuantity(id: number, newQuantity: number) {
    return prisma.stockBatch.update({
      where: { id },
      data: { currentQuantity: newQuantity },
      include: { medicine: true },
    });
  }

  async setBlockStatus(id: number, isBlocked: boolean, blockReason?: string | null) {
    let reasonValue: string | null = null;
    if (isBlocked) {
      if (blockReason) {
        reasonValue = blockReason;
      } else {
        reasonValue = null;
      }
    } else {
      reasonValue = null;
    }

    return prisma.stockBatch.update({
      where: { id },
      data: {
        isBlocked: isBlocked,
        blockReason: reasonValue,
      } as any,
      include: { medicine: true },
    });
  }

  async update(
    id: number,
    data: {
      batchNumber?: string;
      expirationDate?: Date;
      manufacturingDate?: Date | null;
      supplier?: string;
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