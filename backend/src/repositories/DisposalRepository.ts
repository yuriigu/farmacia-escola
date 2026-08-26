import { prisma } from '../utils/prisma';

export class DisposalRepository {
  async findAll() {
    return prisma.disposal.findMany({
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

  async findById(id: number) {
    return prisma.disposal.findUnique({
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

  async create(data: {
    batchId: number;
    userId: number;
    quantity: number;
    reason?: string | null;
  }) {
    return prisma.$transaction(async (tx) => {
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

      await tx.stockBatch.update({
        where: { id: data.batchId },
        data: { currentQuantity: { decrement: data.quantity } },
      });

      return disposal;
    });
  }

  async revert(id: number) {
    return prisma.$transaction(async (tx) => {
      const disposal = await tx.disposal.findUnique({ where: { id } });
      if (!disposal || disposal.reverted) {
        throw new Error('Descarte não encontrado ou já revertido');
      }

      const updated = await tx.disposal.update({
        where: { id },
        data: { reverted: true },
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

  async update(id: number, data: { reason?: string | null }) {
    return prisma.disposal.update({
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

  async delete(id: number) {
    return prisma.$transaction(async (tx) => {
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
