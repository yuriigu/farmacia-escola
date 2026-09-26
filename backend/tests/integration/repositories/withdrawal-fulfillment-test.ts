import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WithdrawalRepository } from '../../../src/repositories/withdrawal-repository';
import { prisma } from '../../../src/utils/prisma';

// testes de integracao do fluxo de dispensacao (withdrawal).
// cobrem dois momentos criticos do repositorio:
// 1) completar o agendamento pendente dentro da transacao do fefo
// 2) cancelar uma dispensacao devolvendo exatamente o saldo ao lote
// usamos mock do prisma pra observar o que o repositorio pede pro
// banco, sem precisar subir sqlite de verdade.
describe('Withdrawal fulfillment', () => {
  let withdrawalRepository: WithdrawalRepository;

  beforeEach(() => {
    // limpa contadores e reinstancia o repositorio entre testes.
    vi.clearAllMocks();
    withdrawalRepository = new WithdrawalRepository();
  });

  // verifica que o createwithfefo, ao atender um agendamento pendente,
  // tambem marca o agendamento como completed na mesma transacao.
  // o appointmentupdate captura o status pra gente checar depois.
  it('completa o agendamento pendente dentro da transacao FEFO', async () => {
    // guarda o status resultante do update pra validar fora do mock.
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
    // withdrawal ja com o item e o lote amarrado, no formato de resposta
    // que o repositorio devolve ao final.
    const completedWithdrawal = {
      ...withdrawal,
      items: [{ quantity: 2, batch: { ...batch, medicine: { id: 9, name: 'Dipirona', dosage: '500 MG' } } }],
    };

    // mock do $transaction. devolve um tx fake com tudo que o
    // createwithfefo encosta: appointment, withdrawal, stockbatch,
    // withdrawalitem e o $queryrawunsafe usado em algum canto.
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

    // confirma que o agendamento virou completed.
    expect(appointmentStatus).toBe('COMPLETED');
    expect(appointmentUpdate).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { status: 'COMPLETED' },
    });
    // confirma a quantidade que veio no resultado.
    expect(result.quantity).toBe(2);
  });

  // verifica que o cancel devolve exatamente a quantidade dispensada
  // ao lote original, atualiza o withdrawal pra cancelled com motivo
  // e grava o log de auditoria. tudo dentro da mesma transacao.
  it('devolve exatamente o saldo dispensado ao cancelar', async () => {
    const batchUpdate = vi.fn().mockResolvedValue({ id: 20, currentQuantity: 12 });
    const withdrawalUpdate = vi.fn().mockResolvedValue({ id: 11, status: 'CANCELLED', cancelReason: 'Erro de separacao' });
    const activityLogCreate = vi.fn().mockResolvedValue({ id: 30 });

    // tx fake com o withdrawal ja completed e o item que aponta pro
    // lote 20 com quantidade 4. e essa quantidade que precisa voltar.
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
      activityLog: {
        create: activityLogCreate,
      },
    }));

    const result = await withdrawalRepository.cancel(11, 'Erro de separacao', 2);

    // confirma a devolucao de saldo ao lote (increment 4).
    expect(batchUpdate).toHaveBeenCalledWith({
      where: { id: 20 },
      data: { currentQuantity: { increment: 4 } },
    });
    // confirma o update do withdrawal pra cancelled com motivo.
    expect(withdrawalUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 11 },
      data: { status: 'CANCELLED', cancelReason: 'Erro de separacao' },
    }));
    // confirma o log de auditoria com acao, entidade e id.
    expect(activityLogCreate).toHaveBeenCalledWith({
      data: {
        userId: 2,
        action: 'cancel',
        entity: 'withdrawals',
        entityId: 11,
        details: 'Estornou a dispensação #11. Motivo: Erro de separacao',
      },
    });
    // confirma o status final devolvido.
    expect(result.status).toBe('CANCELLED');
  });
});