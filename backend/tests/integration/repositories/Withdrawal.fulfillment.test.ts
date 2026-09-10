import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WithdrawalRepository } from '../../../src/repositories/WithdrawalRepository';
import { prisma } from '../../../src/utils/Prisma';

describe('Withdrawal fulfillment', () => {
  let withdrawalRepository: WithdrawalRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    withdrawalRepository = new WithdrawalRepository();
  });

  it('completa o agendamento pendente dentro da transacao FEFO', async () => {
    let appointmentStatus = 'PENDING';
    const appointmentUpdate = vi.fn(async (args: any) => {
      appointmentStatus = args.data.status;
      return { id: 7, status: appointmentStatus };
    });
    const withdrawal = {
      id: 11,
      patientId: 3,
      userId: 4,
      date: new Date('2026-09-10T10:00:00.000Z'),
      status: 'COMPLETED',
      appointmentId: 7,
      patient: { id: 3, name: 'Maria Silva', cpf: '12345678901' },
      user: { name: 'Farmaceutico' },
    };
    const batch = {
      id: 20,
      medicineId: 9,
      batchNumber: 'LOTE-20',
      currentQuantity: 8,
      expirationDate: new Date('2027-01-01T00:00:00.000Z'),
      isBlocked: false,
    };
    const completedWithdrawal = {
      ...withdrawal,
      items: [{ quantity: 2, batch: { ...batch, medicine: { id: 9, name: 'Dipirona', dosage: '500 MG' } } }],
    };

    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback({
      appointment: {
        findUnique: vi.fn().mockResolvedValue({ id: 7, patientId: 3, status: 'PENDING', items: [] }),
        update: appointmentUpdate,
      },
      withdrawal: {
        create: vi.fn().mockResolvedValue(withdrawal),
        findUnique: vi.fn().mockResolvedValue(completedWithdrawal),
      },
      stockBatch: {
        findMany: vi.fn().mockResolvedValue([batch]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      withdrawalItem: {
        create: vi.fn().mockResolvedValue({ id: 1 }),
      },
      $queryRawUnsafe: vi.fn().mockResolvedValue([]),
    }));

    const result = await withdrawalRepository.createWithFefo({
      patientId: 3,
      userId: 4,
      appointmentId: 7,
      items: [{ medicineId: 9, quantity: 2 }],
    });

    expect(appointmentStatus).toBe('COMPLETED');
    expect(appointmentUpdate).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { status: 'COMPLETED' },
    });
    expect(result.quantity).toBe(2);
  });

  it('devolve exatamente o saldo dispensado ao cancelar', async () => {
    const batchUpdate = vi.fn().mockResolvedValue({ id: 20, currentQuantity: 12 });
    const withdrawalUpdate = vi.fn().mockResolvedValue({ id: 11, status: 'CANCELLED', cancelReason: 'Erro de separacao' });

    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback({
      withdrawal: {
        findUnique: vi.fn().mockResolvedValue({
          id: 11,
          status: 'COMPLETED',
          items: [{ batchId: 20, quantity: 4 }],
        }),
        update: withdrawalUpdate,
      },
      stockBatch: {
        update: batchUpdate,
      },
    }));

    const result = await withdrawalRepository.cancel(11, 'Erro de separacao');

    expect(batchUpdate).toHaveBeenCalledWith({
      where: { id: 20 },
      data: { currentQuantity: { increment: 4 } },
    });
    expect(withdrawalUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 11 },
      data: { status: 'CANCELLED', cancelReason: 'Erro de separacao' },
    }));
    expect(result.status).toBe('CANCELLED');
  });
});
