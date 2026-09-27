import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppointmentService } from '../../../src/services/appointment-service';
import { AppointmentRepository } from '../../../src/repositories/appointment-repository';
import { prisma } from '../../../src/utils/prisma';

// testes de integracao da baixa de estoque na dispensacao (retirada).
// no sistema atual a retirada e registrada pela conclusao de um
// agendamento, e o fluxo vive no appointment-service, que aplica o
// fefo (first expired, first out) dentro de uma transacao prisma.
// o foco aqui sao duas garantias de seguranca do estoque:
// 1) duas dispensacoes disputando o mesmo lote nao deixam saldo negativo
// 2) lote com bloqueio sanitario (isblocked: true) e ignorado no fefo
//
// obs: o antigo withdrawal-repository nao existe mais no src; o fluxo
// de retirada foi centralizado no appointment-service.
vi.mock('../../../src/repositories/appointment-repository');
vi.mock('../../../src/repositories/schedule-slot-repository');
vi.mock('../../../src/repositories/medicine-repository');
vi.mock('../../../src/repositories/patient-repository');
vi.mock('../../../src/services/activity-log-service');

describe('Batch Concurrency & Traceability Integration Test', () => {
  let appointmentService: AppointmentService;
  let mockAppRepo: any;

  beforeEach(() => {
    // limpa contadores e reinstancia o service a cada teste pra nao
    // vazar estado entre os casos.
    vi.clearAllMocks();
    mockAppRepo = { findById: vi.fn() };
    (AppointmentRepository as any).mockImplementation(function () {
      return mockAppRepo;
    });
    appointmentService = new AppointmentService();
  });

  // esse teste simula duas requisicoes simultaneas pedindo 7 unidades
  // cada, num lote que so tem 10. a garantia que queremos provar:
  // uma passa e a outra falha por estoque insuficiente, e o saldo final
  // nunca fica negativo (a baixa parcial e desfeita pelo rollback da
  // transacao). o sqlite/libsql serializa as escritas, entao o mock
  // tambem serializa as transacoes pra reproduzir esse comportamento.
  it('deve simular concorrência e impedir que duas requisições simultâneas causem saldo negativo', async () => {
    // estado compartilhado entre as duas chamadas. e ele que permite
    // a segunda ver o saldo ja debitado pela primeira.
    let currentStock = 10;

    // cada agendamento tem um item de 7 unidades do medicamento 10.
    mockAppRepo.findById.mockImplementation(async (id: number) => ({
      id: id,
      patientId: id,
      status: 'PENDING',
      notes: null,
      patient: { id: id, name: `Paciente ${id}`, cpf: '12345678901' },
      items: [{ id: id * 10, appointmentId: id, medicineId: 10, quantity: 7, batchId: null }],
    }));

    // fila que serializa as transacoes, simulando o banco (uma escrita
    // por vez). sem isso, as duas chamadas leriam o mesmo saldo antes
    // de qualquer baixa.
    let queue: Promise<any> = Promise.resolve();
    (prisma.$transaction as any).mockImplementation((callback: any) => {
      const run = queue.then(async () => {
        // snapshot pra simular o rollback da transacao quando o
        // callback estoura (a baixa parcial nao e efetivada).
        const snapshot = currentStock;
        const tx = {
          stockBatch: {
            // devolve o lote atual com o saldo do momento, desde que o
            // filtro de bloqueio sanitario esteja aplicado.
            findMany: async (args: any) => {
              if (args.where.isBlocked === false && currentStock > 0) {
                return [
                  {
                    id: 1,
                    medicineId: 10,
                    batchNumber: 'LOTE-CONC-001',
                    currentQuantity: currentStock,
                    expirationDate: new Date('2099-12-31T00:00:00.000Z'),
                    isBlocked: false,
                  },
                ];
              }
              return [];
            },
            update: async (args: any) => {
              currentStock = args.data.currentQuantity;
              return { id: 1, currentQuantity: currentStock };
            },
          },
          stockMovement: { create: vi.fn().mockResolvedValue({ id: 1 }) },
          appointmentItem: { update: vi.fn().mockResolvedValue({ id: 1 }) },
          appointment: {
            update: async (args: any) => ({ id: args.where.id, status: args.data.status, batchId: args.data.batchId }),
          },
        };
        try {
          return await callback(tx);
        } catch (err) {
          currentStock = snapshot;
          throw err;
        }
      });
      queue = run.then(() => undefined, () => undefined);
      return run;
    });

    // dispara as duas dispensacoes em paralelo, sem await entre elas.
    const results = await Promise.allSettled([
      appointmentService.updateStatus(1, 'FARMACEUTICO', 1, 'COMPLETED'),
      appointmentService.updateStatus(1, 'FARMACEUTICO', 2, 'COMPLETED'),
    ]);

    // separa quem passou e quem falhou.
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // espera exatamente uma de cada, e saldo final 3 (10 - 7).
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect((rejected[0] as PromiseRejectedResult).reason.message).toContain('Estoque insuficiente');
    expect(currentStock).toBe(3);
  });

  // esse teste verifica que o fefo ignora lotes com bloqueio sanitario.
  // mesmo se o lote bloqueado tiver mais saldo, ele nao deve ser
  // escolhido. o mock devolve respostas diferentes conforme o filtro
  // de isblocked que o service usa.
  it('deve ignorar lotes com bloqueio sanitário (isBlocked: true) na seleção automática do FEFO', async () => {
    mockAppRepo.findById.mockResolvedValue({
      id: 3,
      patientId: 3,
      status: 'PENDING',
      notes: null,
      patient: { id: 3, name: 'Paciente 3', cpf: '12345678901' },
      items: [{ id: 31, appointmentId: 3, medicineId: 20, quantity: 5, batchId: null }],
    });

    const blockedBatch = {
      id: 1,
      medicineId: 20,
      batchNumber: 'LOTE-BLOQUEADO-001',
      currentQuantity: 50,
      expirationDate: new Date('2098-01-01T00:00:00.000Z'),
      isBlocked: true,
    };
    const activeBatch = {
      id: 2,
      medicineId: 20,
      batchNumber: 'LOTE-ATIVO-002',
      currentQuantity: 15,
      expirationDate: new Date('2099-01-01T00:00:00.000Z'),
      isBlocked: false,
    };

    // se o filtro de isblocked veio, devolve o ativo. senao, devolve o
    // bloqueado (que nao deveria nem ser considerado, dado o filtro).
    const findMany = vi.fn(async (args: any) => {
      if (args.where.isBlocked === false) {
        return [activeBatch];
      }
      return [blockedBatch];
    });
    const appointmentItemUpdate = vi.fn().mockResolvedValue({ id: 31 });

    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback({
      stockBatch: {
        findMany,
        update: vi.fn().mockResolvedValue({ id: 2, currentQuantity: 10 }),
      },
      stockMovement: { create: vi.fn().mockResolvedValue({ id: 2 }) },
      appointmentItem: { update: appointmentItemUpdate },
      appointment: {
        update: vi.fn(async (args: any) => ({ id: args.where.id, status: args.data.status, batchId: args.data.batchId })),
      },
    }));

    // pede 5 unidades do medicamento 20. o lote bloqueado tem 50 e
    // venceria antes, entao sem filtro ele seria escolhido.
    const result = await appointmentService.updateStatus(1, 'FARMACEUTICO', 3, 'COMPLETED');

    // a busca no banco precisa filtrar lotes bloqueados.
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ medicineId: 20, isBlocked: false }),
    }));
    // confirma que o lote amarrado ao item foi o ativo (id 2).
    expect(appointmentItemUpdate).toHaveBeenCalledWith({ where: { id: 31 }, data: { batchId: 2 } });
    expect(result.batchId).toBe(2);
  });
});
