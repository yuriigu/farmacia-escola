import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BatchService } from '../../../src/services/BatchService';
import { BatchRepository } from '../../../src/repositories/BatchRepository';
import { MedicineRepository } from '../../../src/repositories/MedicineRepository';
import { mockBatch, mockBatchesList } from '../../fixtures/Batches.fixture';
import { mockMedicine } from '../../fixtures/Medicines.fixture';

vi.mock('../../../src/repositories/BatchRepository');
vi.mock('../../../src/repositories/MedicineRepository');
vi.mock('../../../src/services/ActivityLogService');

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

  it('deve criar novo lote com sucesso', async () => {
    mockMedicineRepo.findById.mockResolvedValue(mockMedicine);
    mockBatchRepo.create.mockResolvedValue(mockBatch);

    const result = await batchService.create(1, 'FARMACEUTICO', {
      medicineId: 1,
      batchNumber: 'LOTE-2025-001',
      currentQuantity: 100,
      expirationDate: '2026-12-31',
    });

    expect(result).toEqual(mockBatch);
    expect(mockBatchRepo.create).toHaveBeenCalled();
  });
});