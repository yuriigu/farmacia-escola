import { describe, it, expect, beforeEach } from 'vitest';
import { WithdrawalRepository } from '../../../src/repositories/withdrawal-repository';
import { prisma } from '../../../src/utils/prisma';

describe('Batch Concurrency & Traceability Integration Test', () => {
  let withdrawalRepo: WithdrawalRepository;

  beforeEach(() => {
    withdrawalRepo = new WithdrawalRepository();
  });

  it('deve simular concorrência e impedir que duas requisições simultâneas causem saldo negativo', async () => {
    let currentStock = 10;

    (prisma.$transaction as any).mockImplementation(async (callback: any) => {
      const mockTx = {
        withdrawal: {
          create: async (args: any) => ({
            id: 1,
            patientId: args.data.patientId,
            userId: args.data.userId,
            notes: args.data.notes,
            appointmentId: args.data.appointmentId,
          }),
        },
        withdrawalItem: {
          create: async () => ({ id: 1 }),
        },
        stockBatch: {
          findMany: async () => [
            {
              id: 1,
              medicineId: 10,
              batchNumber: 'LOTE-CONC-001',
              currentQuantity: currentStock,
              expirationDate: new Date('2028-12-31'),
              isBlocked: false,
            },
          ],
          findUnique: async () => ({
            id: 1,
            medicineId: 10,
            batchNumber: 'LOTE-CONC-001',
            currentQuantity: currentStock,
            expirationDate: new Date('2028-12-31'),
            isBlocked: false,
          }),
          updateMany: async (args: any) => {
            const requiredGte = args.where.currentQuantity.gte;
            if (currentStock >= requiredGte) {
              currentStock = currentStock - args.data.currentQuantity.decrement;
              return { count: 1 };
            } else {
              return { count: 0 };
            }
          },
        },
        $queryRawUnsafe: async () => [],
      };
      return callback(mockTx);
    });

    const request1 = withdrawalRepo.createWithFefo({
      patientId: 1,
      userId: 1,
      items: [{ medicineId: 10, quantity: 7 }],
    });

    const request2 = withdrawalRepo.createWithFefo({
      patientId: 2,
      userId: 1,
      items: [{ medicineId: 10, quantity: 7 }],
    });

    const results = await Promise.allSettled([request1, request2]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect(currentStock).toBe(3);
  });

  it('deve ignorar lotes com bloqueio sanitário (isBlocked: true) na seleção automática do FEFO', async () => {
    (prisma.$transaction as any).mockImplementation(async (callback: any) => {
      const mockTx = {
        withdrawal: {
          create: async (args: any) => ({ id: 2 }),
        },
        withdrawalItem: {
          create: async () => ({ id: 2 }),
        },
        stockBatch: {
          findMany: async (args: any) => {
            if (args.where.isBlocked === false) {
              return [
                {
                  id: 2,
                  medicineId: 20,
                  batchNumber: 'LOTE-ATIVO-002',
                  currentQuantity: 15,
                  expirationDate: new Date('2029-01-01'),
                  isBlocked: false,
                },
              ];
            } else {
              return [
                {
                  id: 1,
                  medicineId: 20,
                  batchNumber: 'LOTE-BLOQUEADO-001',
                  currentQuantity: 50,
                  expirationDate: new Date('2027-01-01'),
                  isBlocked: true,
                },
              ];
            }
          },
          updateMany: async () => ({ count: 1 }),
        },
        $queryRawUnsafe: async () => [],
      };
      return callback(mockTx);
    });

    const result = await withdrawalRepo.createWithFefo({
      patientId: 1,
      userId: 1,
      items: [{ medicineId: 20, quantity: 5 }],
    });

    expect(result.allocatedItems).toHaveLength(1);
    expect(result.allocatedItems[0].batchNumber).toBe('LOTE-ATIVO-002');
  });
});
