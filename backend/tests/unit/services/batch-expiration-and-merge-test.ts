import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BatchRepository } from '../../../src/repositories/batch-repository';
import { MedicineRepository } from '../../../src/repositories/medicine-repository';
import { BatchService } from '../../../src/services/batch-service';
import { StockStatusService } from '../../../src/services/stock-status-service';
import { prisma } from '../../../src/utils/prisma';
import { mockMedicine } from '../../fixtures/medicines-fixture';

vi.mock('../../../src/repositories/batch-repository');
vi.mock('../../../src/repositories/medicine-repository');
vi.mock('../../../src/services/activity-log-service');

describe('agregacao de lotes e vencimento diario', () => {
  let batchService: BatchService;
  let batchRepository: any;
  let medicineRepository: any;

  beforeEach(() => {
    vi.clearAllMocks();
    batchRepository = {
      findMergeCandidate: vi.fn(),
      incrementQuantities: vi.fn(),
      create: vi.fn(),
    };
    medicineRepository = { findById: vi.fn().mockResolvedValue(mockMedicine) };

    (BatchRepository as any).mockImplementation(function () {
      return batchRepository;
    });
    (MedicineRepository as any).mockImplementation(function () {
      return medicineRepository;
    });
    batchService = new BatchService();
  });

  it('agrega LOT-100 com mesma validade e fornecedor', async () => {
    const existingBatch = {
      id: 100,
      batchNumber: 'LOT-100',
      currentQuantity: 100,
      initialQuantity: 100,
      supplier: 'Fornecedor A',
      expirationDate: new Date('2027-08-15T00:00:00.000Z'),
    };
    batchRepository.findMergeCandidate.mockResolvedValue(existingBatch);
    batchRepository.incrementQuantities.mockResolvedValue({
      ...existingBatch,
      currentQuantity: 150,
      initialQuantity: 150,
    });

    const result = await batchService.create(7, 'FARMACEUTICO', {
      medicineId: 1,
      batchNumber: ' LOT-100 ',
      currentQuantity: 50,
      expirationDate: '2027-08-15T17:45:00.000Z',
      supplier: ' forneCEDOR A ',
    });

    expect(batchRepository.incrementQuantities).toHaveBeenCalledWith(100, 50);
    expect(batchRepository.create).not.toHaveBeenCalled();
    expect(result.currentQuantity).toBe(150);
    expect(result.initialQuantity).toBe(150);
    expect((prisma as any).stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ batchId: 100, type: 'ENTRY', quantity: 50 }),
    });
  });

  it.each([
    ['validade diferente', '2027-08-16', 'Fornecedor A'],
    ['fornecedor diferente', '2027-08-15', 'Fornecedor B'],
  ])('cria registros distintos quando muda a %s', async (_case, expirationDate, supplier) => {
    batchRepository.findMergeCandidate.mockResolvedValue(null);
    batchRepository.create
      .mockResolvedValueOnce({ id: 101, batchNumber: 'LOT-100', currentQuantity: 100 })
      .mockResolvedValueOnce({ id: 102, batchNumber: 'LOT-100', currentQuantity: 50 });

    const firstBatch = await batchService.create(7, 'FARMACEUTICO', {
      medicineId: 1,
      batchNumber: 'LOT-100',
      currentQuantity: 100,
      expirationDate: '2027-08-15',
      supplier: 'Fornecedor A',
    });
    const secondBatch = await batchService.create(7, 'FARMACEUTICO', {
      medicineId: 1,
      batchNumber: 'LOT-100',
      currentQuantity: 50,
      expirationDate,
      supplier,
    });

    expect(firstBatch.id).not.toBe(secondBatch.id);
    expect(batchRepository.create).toHaveBeenCalledTimes(2);
  });

  it('reavalia a validade por dia com fake timers e zera o saldo vencido', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-05T14:30:00.000Z'));
    const statusService = new StockStatusService();
    const batch = {
      currentQuantity: 25,
      expirationDate: new Date('2026-10-06T18:00:00.000Z'),
      isBlocked: false,
    };

    const beforeExpiration = statusService.calculateMedicineStock([batch]);
    expect(beforeExpiration.status).toBe('CRITICAL_EXPIRATION');
    expect(beforeExpiration.totalQuantity).toBe(25);

    vi.setSystemTime(new Date('2026-10-07T14:30:00.000Z'));
    const afterExpiration = statusService.calculateMedicineStock([batch]);
    expect(afterExpiration.status).toBe('EXPIRED');
    expect(afterExpiration.totalQuantity).toBe(0);
    vi.useRealTimers();
  });
});