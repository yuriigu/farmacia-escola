import { prisma } from '../utils/prisma';

export class DisposalRepository {
  async findAll() {
    const disposals = await prisma.disposal.findMany({
      include: {
        user: { select: { name: true } },
        batch: {
          include: {
            medicine: { select: { id: true, name: true, dosage: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });
    return disposals.map((disposal) => ({
      ...disposal,
      createdAt: disposal.date,
      batch: {
        ...disposal.batch,
        code: disposal.batch.batchNumber,
        expiresAt: disposal.batch.expirationDate,
      },
    }));
  }

  async findById(id: number) {
    const disposal = await prisma.disposal.findUnique({
      where: { id },
      include: {
        user: { select: { name: true } },
        batch: {
          include: {
            medicine: { select: { id: true, name: true, dosage: true } },
          },
        },
      },
    });
    if (!disposal) {
      return null;
    }
    return {
      ...disposal,
      createdAt: disposal.date,
      batch: {
        ...disposal.batch,
        code: disposal.batch.batchNumber,
        expiresAt: disposal.batch.expirationDate,
      },
    };
  }

  async create(data: {
    batchId: number;
    userId: number;
    quantity: number;
    reason: string;
    notes?: string | null;
  }) {
    return prisma.$transaction(async (tx) => {
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
          notes: data.notes,
          status: 'DISPOSED',
        },
        include: {
          user: { select: { name: true } },
          batch: {
            include: {
              medicine: { select: { id: true, name: true, dosage: true } },
            },
          },
        },
      });

      await tx.stockMovement.create({
        data: {
          batchId: data.batchId,
          type: 'DISPOSAL',
          quantity: -data.quantity,
          notes: 'Descarte de material #' + disposal.id + '. Motivo: ' + data.reason,
          userId: data.userId,
        },
      });

      return disposal;
    });
  }

  async revert(id: number, userId: number, revertReason: string) {
    return prisma.$transaction(async (tx) => {
      const disposal = await tx.disposal.findUnique({ where: { id } });
      if (!disposal) {
        throw { statusCode: 404, message: 'Descarte não encontrado' };
      }
      if (disposal.status === 'REVERTED') {
        throw { statusCode: 400, message: 'O descarte já foi revertido' };
      }

      const updateDisposalResult = await tx.disposal.updateMany({
        where: {
          id: id,
          status: 'DISPOSED',
        },
        data: {
          status: 'REVERTED',
          revertReason,
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
              medicine: { select: { id: true, name: true, dosage: true } },
            },
          },
        },
      });

      await tx.stockBatch.update({
        where: { id: disposal.batchId },
        data: { currentQuantity: { increment: disposal.quantity } },
      });

      await tx.stockMovement.create({
        data: {
          batchId: disposal.batchId,
          type: 'REVERT',
          quantity: disposal.quantity,
          notes: 'Reversão do descarte #' + id + '. Motivo: ' + revertReason,
          userId: userId,
        },
      });

      await tx.activityLog.create({
        data: {
          userId,
          action: 'revert',
          entity: 'disposals',
          entityId: id,
          details: `Reverteu o descarte #${id}. Motivo: ${revertReason}`,
        },
      });

      if (!updated) {
        throw { statusCode: 404, message: 'Descarte não encontrado' };
      }
      return {
        ...updated,
        createdAt: updated.date,
        batch: {
          ...updated.batch,
          code: updated.batch.batchNumber,
          expiresAt: updated.batch.expirationDate,
        },
      };
    });
  }

  async update(id: number, data: { reason?: string; notes?: string }) {
    return prisma.disposal.update({
      where: { id },
      data,
      include: {
        user: { select: { name: true } },
        batch: {
          include: {
            medicine: { select: { id: true, name: true, dosage: true } },
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

      if (disposal.status === 'DISPOSED') {
        await tx.stockBatch.update({
          where: { id: disposal.batchId },
          data: { currentQuantity: { increment: disposal.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            batchId: disposal.batchId,
            type: 'REVERT',
            quantity: disposal.quantity,
            notes: 'Exclusão do descarte #' + id,
            userId: null,
          },
        });
      }

      return tx.disposal.delete({ where: { id } });
    });
  }
}