import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DisposalRepository } from '../../../src/repositories/disposal-repository';
import { prisma } from '../../../src/utils/prisma';

// testes de integracao do ciclo de vida do descarte.
// cobrem as duas operacoes mais criticas do disposal-repository:
// criar um descarte (com baixa no lote) e reverter um descarte
// (com recomposicao do saldo e log de auditoria), sempre dentro
// de uma transacao.
// usamos mock do prisma pra observar exatamente o que o repositorio
// pede pro banco, sem precisar subir sqlite de verdade.
describe('Disposal lifecycle integration', () => {
  let disposalRepository: DisposalRepository;

  beforeEach(() => {
    // limpa contadores e reinstancia o repositorio entre os testes.
    vi.clearAllMocks();
    disposalRepository = new DisposalRepository();
  });

  // verifica que o create faz as duas coisas na mesma transacao:
  // 1) debita do lote com updatemany condicional (currentquantity >= qtd)
  // 2) cria o registro de descarte com os campos esperados
  // o updatemany condicional e a protecao contra concorrencia.
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

    // mock do $transaction. ele so chama o callback com um tx fake
    // contendo os metodos que o repositorio usa.
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

    // confirma o debito condicional no lote.
    expect(batchUpdate).toHaveBeenCalledWith({
      where: { id: 5, currentQuantity: { gte: 4 } },
      data: { currentQuantity: { decrement: 4 } },
    });
    // confirma que o descarte foi criado com os dados certos.
    expect(disposalCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ reason: 'EXPIRED', notes: 'Validade expirada' }),
    }));
    // confirma o status inicial.
    expect(result.status).toBe('DISPOSED');
  });

  // verifica que o revert faz as tres coisas na mesma transacao:
  // 1) marca o descarte como revertido (updatemany condicional)
  // 2) devolve a quantidade ao lote (increment)
  // 3) registra o log de auditoria com o motivo
  // o updatemany condicional evita reverter duas vezes o mesmo descarte.
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

    // o findunique e chamado duas vezes: uma pra ler o descarte atual
    // e outra pra ler depois do update. mockamos com mockresolvedvalueonce
    // em sequencia pra simular as duas leituras.
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

    // confirma o updatemany condicional do descarte (so se ainda
    // estiver disposed e nao revertido).
    expect(disposalUpdate).toHaveBeenCalledWith({
      where: { id: 10, status: 'DISPOSED', reverted: false },
      data: {
        status: 'REVERTED',
        reverted: true,
        revertReason: 'Descarte registrado incorretamente',
      },
    });
    // confirma a devolucao de saldo ao lote.
    expect(batchUpdate).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { currentQuantity: { increment: 4 } },
    });
    // confirma o log de auditoria com a acao, entidade, id e motivo.
    expect(activityLogCreate).toHaveBeenCalledWith({
      data: {
        userId: 2,
        action: 'revert',
        entity: 'disposals',
        entityId: 10,
        details: 'Reverteu o descarte #10. Motivo: Descarte registrado incorretamente',
      },
    });
    // confirma o status final devolvido.
    expect(result.status).toBe('REVERTED');
  });
});