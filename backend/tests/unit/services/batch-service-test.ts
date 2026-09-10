import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BatchService } from '../../../src/services/batch-service';
import { BatchRepository } from '../../../src/repositories/batch-repository';
import { MedicineRepository } from '../../../src/repositories/medicine-repository';
import { mockBatch, mockBatchesList } from '../../fixtures/batches-fixture';
import { mockMedicine } from '../../fixtures/medicines-fixture';

vi.mock('../../../src/repositories/batch-repository');
vi.mock('../../../src/repositories/medicine-repository');
vi.mock('../../../src/services/activity-log-service');

describe('BatchService', () => {
  let batchService: BatchService;
  let mockBatchRepo: any;
  let mockMedicineRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBatchRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByBatchNumber: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      setQuantity: vi.fn(),
      setBlockStatus: vi.fn(),
      delete: vi.fn(),
    };
    mockMedicineRepo = {
      findById: vi.fn(),
    };

    (BatchRepository as any).mockImplementation(function () {
      return mockBatchRepo;
    });
    (MedicineRepository as any).mockImplementation(function () {
      return mockMedicineRepo;
    });

    batchService = new BatchService();
  });

  it('deve listar lotes', async () => {
    mockBatchRepo.findAll.mockResolvedValue(mockBatchesList);

    const result = await batchService.getAll();

    expect(result).toEqual(mockBatchesList);
    expect(mockBatchRepo.findAll).toHaveBeenCalledTimes(1);
  });

  it('deve buscar lote por ID', async () => {
    mockBatchRepo.findById.mockResolvedValue(mockBatch);

    const result = await batchService.getById(1);

    expect(result).toEqual(mockBatch);
    expect(mockBatchRepo.findById).toHaveBeenCalledWith(1);
  });

  it('deve criar novo lote com sucesso incluindo fornecedor', async () => {
    mockMedicineRepo.findById.mockResolvedValue(mockMedicine);
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