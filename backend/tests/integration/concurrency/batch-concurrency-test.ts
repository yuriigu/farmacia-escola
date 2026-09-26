import { describe, it, expect, beforeEach } from 'vitest';
import { WithdrawalRepository } from '../../../src/repositories/withdrawal-repository';
import { prisma } from '../../../src/utils/prisma';

// testes de integracao do repositorio de retirada (withdrawal).
// o foco aqui nao e o caminho feliz, e sim as garantias de seguranca
// do fefo sob concorrencia e a exclusao de lotes bloqueados.
// usamos mock do prisma pra controlar o estado do estoque entre as
// chamadas e observar exatamente o que o repositorio faz.
describe('Batch Concurrency & Traceability Integration Test', () => {
  let withdrawalRepo: WithdrawalRepository;

  beforeEach(() => {
    // reinstancia o repositorio a cada teste pra nao vazar estado
    // entre os casos.
    withdrawalRepo = new WithdrawalRepository();
  });

  // esse teste simula duas requisicoes simultaneas pedindo 7 unidades
  // cada, num lote que so tem 10. a garantia que queremos provar:
  // uma passa e a outra falha, e o saldo final nunca fica negativo.
  // a checagem critica e o updatemany condicional (currentquantity >= qtd)
  // dentro da transacao, que protege contra corrida.
  it('deve simular concorrência e impedir que duas requisições simultâneas causem saldo negativo', async () => {
    // estado compartilhado entre as duas chamadas. e ele que permite
    // a segunda ver o saldo ja debitado pela primeira.
    let currentStock = 10;

    // mock do $transaction do prisma. devolve um tx falso com os
    // metodos que o repositorio chama, mantendo o "banco" em memoria.
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
          // devolve o lote atual com o saldo do momento.
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
          // simulacao do debito condicional: so decrementa se o saldo
          // atual for maior ou igual ao exigido. e isso que faz a
          // segunda requisicao falhar em vez de deixar saldo negativo.
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

    // dispara as duas requisicoes em paralelo, sem await entre elas,
    // pra forcar a concorrencia de verdade.
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

    // allsettled porque a gente espera que uma falhe.
    const results = await Promise.allSettled([request1, request2]);

    // separa quem passou e quem falhou.
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // espera exatamente uma de cada, e saldo final 3 (10 - 7).
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect(currentStock).toBe(3);
  });

  // esse teste verifica que o fefo ignora lotes com bloqueio sanitario.
  // mesmo se o lote bloqueado vencer antes e tiver mais saldo, ele nao
  // deve ser escolhido. o mock devolve respostas diferentes conforme o
  // filtro de isblocked que o repositorio usa.
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
          // simula dois cenarios: se o repositorio filtrou por isblocked: false,
          // devolve so o lote ativo. senao, devolve o bloqueado (que nao
          // deveria nem ser considerado, dado o filtro).
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

    // pede 5 unidades do medicamento 20. o lote bloqueado tem 50
    // e vence antes, entao sem filtro ele seria escolhido. com filtro,
    // deve cair no ativo.
    const result = await withdrawalRepo.createWithFefo({
      patientId: 1,
      userId: 1,
      items: [{ medicineId: 20, quantity: 5 }],
    });

    // confirma que so alocou um item, e que foi do lote ativo.
    expect(result.allocatedItems).toHaveLength(1);
    expect(result.allocatedItems[0].batchNumber).toBe('LOTE-ATIVO-002');
  });
});