import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DisposalService } from '../../../src/services/disposal-service';
import { DisposalRepository } from '../../../src/repositories/disposal-repository';
import { BatchRepository } from '../../../src/repositories/batch-repository';
import { mockBatch } from '../../fixtures/batches-fixture';

// mockamos os dois repositorios que o disposal-service usa e o
// activity-log-service, pra isolar a regra de negocio do service.
// os testes aqui cobrem o caminho basico: listar e criar descarte
// com motivo valido. o fluxo de reversao e exclusao fica coberto em
// outros testes.
vi.mock('../../../src/repositories/disposal-repository');
vi.mock('../../../src/repositories/batch-repository');
vi.mock('../../../src/services/activity-log-service');

// testes do disposal-service.
// o foco e a delegacao pro repositorio e a validacao minima do
// payload (lote, quantidade, motivo) antes de bater no banco.
describe('DisposalService', () => {
  let disposalService: DisposalService;
  let mockDisposalRepo: any;
  let mockBatchRepo: any;

  beforeEach(() => {
    // limpa contadores entre testes.
    vi.clearAllMocks();

    // mock do repositorio de descarte com os metodos usados pelo service.
    mockDisposalRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
    };
    // mock do repositorio de lote, usado pra checar que o lote existe
    // antes de registrar o descarte.
    mockBatchRepo = {
      findById: vi.fn(),
    };

    // quando o service instancia cada repositorio no construtor,
    // essas implementacoes entregam os mocks no lugar.
    (DisposalRepository as any).mockImplementation(function () {
      return mockDisposalRepo;
    });
    (BatchRepository as any).mockImplementation(function () {
      return mockBatchRepo;
    });

    disposalService = new DisposalService();
  });

  // verifica que o getall delega pro findall do repo e devolve o
  // resultado como veio.
  it('deve listar todos os descartes', async () => {
    mockDisposalRepo.findAll.mockResolvedValue([]);

    const result = await disposalService.getAll();

    expect(result).toEqual([]);
    expect(mockDisposalRepo.findAll).toHaveBeenCalledTimes(1);
  });

  // caminho feliz do create: lote existe, motivo valido, e o repo
  // devolve o descarte criado. o teste confirma que o create do repo
  // foi chamado e que o service propagou o id do resultado.
  it('deve criar descarte de lote com motivo válido', async () => {
    mockBatchRepo.findById.mockResolvedValue({
      ...mockBatch,
      currentQuantity: 30,
    });
    mockDisposalRepo.create.mockResolvedValue({
      id: 1,
      batchId: 1,
      quantity: 10,
      reason: 'EXPIRED',
      batch: {
        batchNumber: 'LOTE-001',
      },
    });

    const result = await disposalService.create(1, 'FARMACEUTICO', {
      batchId: 1,
      quantity: 10,
      reason: 'EXPIRED',
    });

    expect(result.id).toBe(1);
    expect(mockDisposalRepo.create).toHaveBeenCalled();
  });
});