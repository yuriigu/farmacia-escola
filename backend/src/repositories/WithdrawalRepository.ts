import { prisma } from '../utils/prisma';

export class WithdrawalRepository {
  async findAll(patientId?: number) {
    const where = patientId ? { patientId } : {};
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
        await tx.withdrawalItem.create({
          data: {
            withdrawalId: withdrawal.id,
            batchId: item.batchId,
            quantity: item.quantity,
          },
        });

        await tx.stockBatch.update({
          where: { id: item.batchId },
          data: { currentQuantity: { decrement: item.quantity } },
        });
      }

      return withdrawal;
    });
  }
}
