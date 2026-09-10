import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DisposalRepository } from '../../../src/repositories/disposal-repository';
import { prisma } from '../../../src/utils/prisma';

describe('Disposal lifecycle integration', () => {
  let disposalRepository: DisposalRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    disposalRepository = new DisposalRepository();
  });

  it('baixa o saldo e cria o descarte na mesma transacao', async () => {
    const batchUpdate = vi.fn().mockResolvedValue({ count: 1 });
    const disposalCreate = vi.fn().mockResolvedValue({
      id: 10,
      batchId: 5,
      userId: 2,
      quantity: 4,
      reason: 'EXPIRED',
      status: 'DISPOSED',
      date: new Date('2026-09-10T10:00:00.000Z'),
      batch: {
        id: 5,
        batchNumber: 'LOT-005',
        medicine: { id: 3, name: 'Dipirona', dosage: '500 MG' },
      },
      user: { name: 'Farmaceutico' },
    });

    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback({
      stockBatch: {
        findUnique: vi.fn().mockResolvedValue({ id: 5, currentQuantity: 12 }),
        updateMany: batchUpdate,
      },
      disposal: {
        create: disposalCreate,
      },
    }));

    const result = await disposalRepository.create({
      batchId: 5,
      userId: 2,
      quantity: 4,
      reason: 'EXPIRED',
      notes: 'Validade expirada',
    });

    expect(batchUpdate).toHaveBeenCalledWith({
      where: { id: 5, currentQuantity: { gte: 4 } },
      data: { currentQuantity: { decrement: 4 } },
    });
    expect(disposalCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ reason: 'EXPIRED', notes: 'Validade expirada' }),
    }));
    expect(result.status).toBe('DISPOSED');
  });

  it('reverte, recompõe o saldo e audita na mesma transacao', async () => {
    const disposalUpdate = vi.fn().mockResolvedValue({ count: 1 });
    const batchUpdate = vi.fn().mockResolvedValue({ id: 5, currentQuantity: 16 });
    const activityLogCreate = vi.fn().mockResolvedValue({ id: 20 });
    const updatedDisposal = {
      id: 10,
      batchId: 5,
      quantity: 4,
      status: 'REVERTED',
      revertReason: 'Descarte registrado incorretamente',
      date: new Date('2026-09-10T10:00:00.000Z'),
      batch: {
        id: 5,
        batchNumber: 'LOT-005',
        expirationDate: new Date('2027-01-01T00:00:00.000Z'),
        medicine: { id: 3, name: 'Dipirona', dosage: '500 MG' },
      },
      user: { name: 'Farmaceutico' },
    };

    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback({
      disposal: {
        findUnique: vi.fn()
          .mockResolvedValueOnce({ id: 10, batchId: 5, quantity: 4, status: 'DISPOSED', reverted: false })
          .mockResolvedValueOnce(updatedDisposal),
        updateMany: disposalUpdate,
      },
      stockBatch: {
        update: batchUpdate,
      },
      activityLog: {
        create: activityLogCreate,
      },
    }));

    const result = await disposalRepository.revert(10, 2, 'Descarte registrado incorretamente');

    expect(disposalUpdate).toHaveBeenCalledWith({
      where: { id: 10, status: 'DISPOSED', reverted: false },
      data: {
        status: 'REVERTED',
        reverted: true,
        revertReason: 'Descarte registrado incorretamente',
      },
    });
    expect(batchUpdate).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { currentQuantity: { increment: 4 } },
    });
    expect(activityLogCreate).toHaveBeenCalledWith({
      data: {
        userId: 2,
        action: 'revert',
        entity: 'disposals',
        entityId: 10,
        details: 'Reverteu o descarte #10. Motivo: Descarte registrado incorretamente',
      },
    });
    expect(result.status).toBe('REVERTED');
  });
});
