import { Prisma } from '@prisma/client';
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

        if ((batch as any).isBlocked) {
          throw { statusCode: 400, message: 'O lote selecionado está bloqueado sanitariamente e não pode ser dispensado' };
        }

        if (batch.expirationDate) {
          const now = new Date();
          const expDate = new Date(batch.expirationDate);
          if (expDate.getTime() < now.getTime()) {
            throw { statusCode: 400, message: 'O lote selecionado está vencido e não pode ser dispensado' };
          }
        }

        if (batch.currentQuantity < item.quantity) {
          throw { statusCode: 400, message: 'Quantidade insuficiente em estoque para o lote informado' };
        }

        if (typeof (tx as any).$queryRawUnsafe === 'function') {
          try {
            await tx.$queryRawUnsafe(`SELECT id, currentQuantity FROM StockBatch WHERE id = ${item.batchId} FOR UPDATE`);
          } catch {
            try {
              await tx.$queryRawUnsafe(`SELECT id, currentQuantity FROM StockBatch WHERE id = ${item.batchId}`);
            } catch {
              // Ignore if query fails
            }
          }
        }

        const updateResult = await tx.stockBatch.updateMany({
          where: {
            id: item.batchId,
            isBlocked: false,
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
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  async createWithFefo(data: {
    patientId: number;
    userId: number;
    notes?: string | null;
    appointmentId?: number | null;
    items: Array<{ medicineId?: number; batchId?: number; quantity: number }>;
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

      const allocatedBatches = [];

      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        let remainingNeeded = item.quantity;
        let targetMedicineId = item.medicineId;

        if (!targetMedicineId) {
          if (item.batchId) {
            const specificBatch = await tx.stockBatch.findUnique({
              where: { id: item.batchId },
            });
            if (!specificBatch) {
              throw { statusCode: 404, message: 'Lote não encontrado' };
            } else {
              if ((specificBatch as any).isBlocked) {
                throw { statusCode: 400, message: 'O lote selecionado está bloqueado sanitariamente e não pode ser dispensado' };
              }
              const nowCheck = new Date();
              const batchExp = new Date(specificBatch.expirationDate);
              if (batchExp.getTime() < nowCheck.getTime()) {
                throw { statusCode: 400, message: 'O lote selecionado está vencido e não pode ser dispensado' };
              }
              targetMedicineId = specificBatch.medicineId;
            }
          }
        }

        if (!targetMedicineId) {
          throw { statusCode: 400, message: 'Identificação do medicamento ou lote é obrigatória' };
        }

        const now = new Date();
        const candidateBatches = await tx.stockBatch.findMany({
          where: {
            medicineId: targetMedicineId,
            isBlocked: false,
            currentQuantity: { gt: 0 },
            expirationDate: { gte: now },
          },
          orderBy: { expirationDate: 'asc' },
        });

        if (candidateBatches.length === 0) {
          throw { statusCode: 400, message: 'Não há lotes com saldo disponível dentro da validade para o medicamento' };
        }

        let totalAvailable = 0;
        for (let cIdx = 0; cIdx < candidateBatches.length; cIdx++) {
          totalAvailable = totalAvailable + candidateBatches[cIdx].currentQuantity;
        }

        if (totalAvailable < remainingNeeded) {
          throw { statusCode: 400, message: 'Estoque insuficiente nos lotes válidos para atender a dispensação' };
        }

        for (let bIdx = 0; bIdx < candidateBatches.length; bIdx++) {
          if (remainingNeeded <= 0) {
            break;
          }
          const batch = candidateBatches[bIdx];
          let deductQty = 0;
          if (batch.currentQuantity <= remainingNeeded) {
            deductQty = batch.currentQuantity;
          } else {
            deductQty = remainingNeeded;
          }

          try {
            await tx.$queryRawUnsafe(`SELECT id, currentQuantity FROM StockBatch WHERE id = ${batch.id} FOR UPDATE`);
          } catch {
            await tx.$queryRawUnsafe(`SELECT id, currentQuantity FROM StockBatch WHERE id = ${batch.id}`);
          }

          const updateResult = await tx.stockBatch.updateMany({
            where: {
              id: batch.id,
              isBlocked: false,
              currentQuantity: {
                gte: deductQty,
              },
            },
            data: {
              currentQuantity: {
                decrement: deductQty,
              },
            },
          });

          if (updateResult.count === 0) {
            throw { statusCode: 400, message: 'Estoque insuficiente no lote devido à concorrência de operações' };
          }

          await tx.withdrawalItem.create({
            data: {
              withdrawalId: withdrawal.id,
              batchId: batch.id,
              quantity: deductQty,
            },
          });

          allocatedBatches.push({
            batchId: batch.id,
            batchNumber: batch.batchNumber,
            quantity: deductQty,
          });

          remainingNeeded = remainingNeeded - deductQty;
        }
      }

      return {
        ...withdrawal,
        allocatedItems: allocatedBatches,
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
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