import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BatchService } from '../../../src/services/batch-service';
import { BatchRepository } from '../../../src/repositories/batch-repository';
import { MedicineRepository } from '../../../src/repositories/medicine-repository';
import { mockBatch, mockBatchesList } from '../../fixtures/batches-fixture';
import { mockMedicine } from '../../fixtures/medicines-fixture';

// mockamos os dois repositorios e o activity-log-service pra isolar
// o batch-service. aqui a gente testa a regra de negocio dos lotes:
// listar, buscar por id, criar, ajustar saldo com justificativa e
// bloquear/desbloquear sanitariamente. o log de auditoria entra como
// mock porque o service chama ele em todos os fluxos de escrita.
vi.mock('../../../src/repositories/batch-repository');
vi.mock('../../../src/repositories/medicine-repository');
vi.mock('../../../src/services/activity-log-service');

// testes do batch-service.
// cobrem o crud basico e as duas operacoes sensiveis: ajuste de saldo
// e bloqueio/desbloqueio sanitario.
describe('BatchService', () => {
  let batchService: BatchService;
  let mockBatchRepo: any;
  let mockMedicineRepo: any;

  beforeEach(() => {
    // limpa contadores entre testes.
    vi.clearAllMocks();

    // mock do repositorio de lote com os metodos que o service usa.
    mockBatchRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByMedicineAndBatchNumber: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      setQuantity: vi.fn(),
      setBlockStatus: vi.fn(),
      delete: vi.fn(),
    };
    // mock do repositorio de medicamento, usado no create pra validar
    // que o medicamento existe antes de criar o lote.
    mockMedicineRepo = {
      findById: vi.fn(),
    };

    // quando o service instancia cada repositorio no construtor,
    // essas implementacoes entregam os mocks no lugar.
    (BatchRepository as any).mockImplementation(function () {
      return mockBatchRepo;
    });
    (MedicineRepository as any).mockImplementation(function () {
      return mockMedicineRepo;
    });

    batchService = new BatchService();
  });

  // verifica que o getall delega pro findall do repo e devolve o
  // resultado sem transformacao.
  it('deve listar lotes', async () => {
    mockBatchRepo.findAll.mockResolvedValue(mockBatchesList);

    const result = await batchService.getAll();

    expect(result).toEqual(mockBatchesList);
    expect(mockBatchRepo.findAll).toHaveBeenCalledTimes(1);
  });

  // verifica que o getbyid chama o findbyid com o id certo e devolve
  // o que o repo retornar.
  it('deve buscar lote por ID', async () => {
    mockBatchRepo.findById.mockResolvedValue(mockBatch);

    const result = await batchService.getById(1);

    expect(result).toEqual(mockBatch);
    expect(mockBatchRepo.findById).toHaveBeenCalledWith(1);
  });

  // caminho feliz do create. o mockmedicinerepo ja resolve com o
  // fixture pro service passar na validacao de "medicamento existe".
  // o test confirma que o create do repo foi chamado.
  it('deve criar novo lote com sucesso incluindo fornecedor', async () => {
    mockMedicineRepo.findById.mockResolvedValue(mockMedicine);
    // sem lote duplicado com o mesmo numero pro medicamento.
    mockBatchRepo.findByMedicineAndBatchNumber.mockResolvedValue(null);
    mockBatchRepo.create.mockResolvedValue(mockBatch);

    const result = await batchService.create(1, 'FARMACEUTICO', {
      medicineId: 1,
      batchNumber: 'LOTE-2025-001',
      currentQuantity: 100,
      expirationDate: '2026-12-31',
      supplier: 'Laboratório Farmacêutico Nacional',
    });

    expect(result).toEqual(mockBatch);
    expect(mockBatchRepo.create).toHaveBeenCalled();
  });

  // verifica o ajuste auditado de saldo: chama setquantity com o
  // valor absoluto novo, e o retorno traz a quantidade atualizada.
  it('deve realizar ajuste de estoque com justificativa e log', async () => {
    mockBatchRepo.findById.mockResolvedValue(mockBatch);
    const updatedBatch = { ...mockBatch, currentQuantity: 95 };
    mockBatchRepo.setQuantity.mockResolvedValue(updatedBatch);

    const result = await batchService.adjustStock(1, 'FARMACEUTICO', 1, {
      newQuantity: 95,
      reason: 'Inventário rotativo conferido',
    });

    expect(result.currentQuantity).toBe(95);
    expect(mockBatchRepo.setQuantity).toHaveBeenCalledWith(1, 95);
  });

  // caminho de bloqueio: exige motivo e passa pro repo com o motivo
  // preenchido. o retorno do service deve trazer isblocked=true e o
  // motivo.
  it('deve bloquear lote com motivo sanitário', async () => {
    mockBatchRepo.findById.mockResolvedValue(mockBatch);
    const blockedBatch = { ...mockBatch, isBlocked: true, blockReason: 'Recall sanitário Anvisa' };
    mockBatchRepo.setBlockStatus.mockResolvedValue(blockedBatch);

    const result = await batchService.setBlockStatus(1, 'FARMACEUTICO', 1, {
      isBlocked: true,
      blockReason: 'Recall sanitário Anvisa',
    });

    expect((result as any).isBlocked).toBe(true);
    expect((result as any).blockReason).toBe('Recall sanitário Anvisa');
    expect(mockBatchRepo.setBlockStatus).toHaveBeenCalledWith(1, true, 'Recall sanitário Anvisa');
  });

  // caminho de desbloqueio: o motivo e limpo (null) e o repo recebe
  // isblocked=false com motivo null. e a regra de negocio: motivo so
  // faz sentido enquanto o lote esta bloqueado.
  it('deve desbloquear lote sanitariamente', async () => {
    const blockedBatch = { ...mockBatch, isBlocked: true, blockReason: 'Suspeita de avaria' };
    mockBatchRepo.findById.mockResolvedValue(blockedBatch);
    const unblockedBatch = { ...mockBatch, isBlocked: false, blockReason: null };
    mockBatchRepo.setBlockStatus.mockResolvedValue(unblockedBatch);

    const result = await batchService.setBlockStatus(1, 'FARMACEUTICO', 1, {
      isBlocked: false,
    });

    expect((result as any).isBlocked).toBe(false);
    expect(mockBatchRepo.setBlockStatus).toHaveBeenCalledWith(1, false, null);
  });
});