import { prisma } from '../utils/Prisma';

export class WithdrawalRepository {
  async findAll(patientId?: number) {
    let where = {};
    if (patientId) {
      where = { patientId };
    } else {
      where = {};
    }
    return prisma.withdrawal.findMany({
      where,
      include: {
        user: { select: { name: true } },
        patient: { select: { name: true, cpf: true } },
        items: {
          include: {
            batch: {
              include: {
                medicine: { select: { name: true, dosage: true } },
              },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findById(id: number) {
    return prisma.withdrawal.findUnique({
      where: { id },
      include: {
        user: { select: { name: true } },
        patient: { select: { name: true, cpf: true } },
        items: {
          include: {
            batch: {
              include: {
                medicine: { select: { name: true, dosage: true } },
              },
            },
          },
        },
      },
    });
  }

  async create(data: {
    patientId: number;
    userId: number;
    notes?: string | null;
    appointmentId?: number | null;
    items: Array<{ batchId: number; quantity: number }>;
  }) {
    return prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawal.create({
        data: {
          patientId: data.patientId,
          userId: data.userId,
          notes: data.notes,
          appointmentId: data.appointmentId,
        },
        include: {
          user: { select: { name: true } },
          patient: { select: { name: true, cpf: true } },
        },
      });

      for (const item of data.items) {
        const batch = await tx.stockBatch.findUnique({
          where: { id: item.batchId },
        });

        if (!batch) {
          throw { statusCode: 404, message: 'Lote não encontrado' };
        }

        if (batch.currentQuantity < item.quantity) {
          throw { statusCode: 400, message: 'Quantidade insuficiente em estoque para o lote informado' };
        }

        const updateResult = await tx.stockBatch.updateMany({
          where: {
            id: item.batchId,
            currentQuantity: {
              gte: item.quantity,
            },
          },
          data: {
            currentQuantity: {
              decrement: item.quantity,
            },
          },
        });

        if (updateResult.count === 0) {
          throw { statusCode: 400, message: 'Estoque insuficiente no lote devido à concorrência de operações' };
        }

        await tx.withdrawalItem.create({
          data: {
            withdrawalId: withdrawal.id,
            batchId: item.batchId,
            quantity: item.quantity,
          },
        });
      }

      return withdrawal;
    });
  }

  async update(id: number, data: { notes?: string | null }) {
    return prisma.withdrawal.update({
      where: { id },
      data,
      include: {
        user: { select: { name: true } },
        patient: { select: { name: true, cpf: true } },
        items: {
          include: {
            batch: {
              include: {
                medicine: { select: { name: true, dosage: true } },
              },
            },
          },
        },
      },
    });
  }

  async delete(id: number) {
    return prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawal.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!withdrawal) {
        throw new Error('Dispensação não encontrada');
      }

      for (const item of withdrawal.items) {
        await tx.stockBatch.update({
          where: { id: item.batchId },
          data: { currentQuantity: { increment: item.quantity } },
        });
      }

      await tx.withdrawalItem.deleteMany({
        where: { withdrawalId: id },
      });

      return tx.withdrawal.delete({
        where: { id },
      });
    });
  }
}