import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DisposalService } from '../../../src/services/DisposalService';
import { DisposalRepository } from '../../../src/repositories/DisposalRepository';
import { BatchRepository } from '../../../src/repositories/BatchRepository';
import { mockBatch } from '../../fixtures/Batches.fixture';

vi.mock('../../../src/repositories/DisposalRepository');
vi.mock('../../../src/repositories/BatchRepository');
vi.mock('../../../src/services/ActivityLogService');

describe('DisposalService', () => {
  let disposalService: DisposalService;
  let mockDisposalRepo: any;
  let mockBatchRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDisposalRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
    };
    mockBatchRepo = {
      findById: vi.fn(),
    };

    (DisposalRepository as any).mockImplementation(function () {
      return mockDisposalRepo;
    });
    (BatchRepository as any).mockImplementation(function () {
      return mockBatchRepo;
    });

    disposalService = new DisposalService();
  });

  it('deve listar todos os descartes', async () => {
    mockDisposalRepo.findAll.mockResolvedValue([]);

    const result = await disposalService.getAll();

    expect(result).toEqual([]);
    expect(mockDisposalRepo.findAll).toHaveBeenCalledTimes(1);
  });

  it('deve criar descarte de lote com motivo válido', async () => {
    mockBatchRepo.findById.mockResolvedValue({
      ...mockBatch,
      currentQuantity: 30,
    });
    mockDisposalRepo.create.mockResolvedValue({
      id: 1,
      batchId: 1,
      quantity: 10,
      reason: 'Vencimento',
    });

    const result = await disposalService.create(1, 'FARMACEUTICO', {
      batchId: 1,
      quantity: 10,
      reason: 'Vencimento',
    });

    expect(result.id).toBe(1);
    expect(mockDisposalRepo.create).toHaveBeenCalled();
  });
});