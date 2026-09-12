import { prisma } from '../utils/prisma';

export class BatchRepository {
  async findAll(medicineId?: number) {
    let where: any = {
      medicine: {
        deletedAt: null,
      },
    };
    if (medicineId) {
      where = {
        medicineId: medicineId,
        medicine: {
          deletedAt: null,
        },
      };
    }
    return prisma.stockBatch.findMany({
      where: where,
      include: { medicine: true },
      orderBy: { expirationDate: 'asc' },
    });
  }

  async findById(id: number) {
    return prisma.stockBatch.findFirst({
      where: {
        id: id,
        medicine: {
          deletedAt: null,
        },
      },
      include: { medicine: true },
    });
  }

  async findByMedicineAndBatchNumber(medicineId: number, batchNumber: string) {
    return prisma.stockBatch.findFirst({
      where: {
        medicineId: medicineId,
        batchNumber: batchNumber,
      },
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