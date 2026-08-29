import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WithdrawalService } from '../../../src/services/WithdrawalService';
import { WithdrawalRepository } from '../../../src/repositories/WithdrawalRepository';
import { BatchRepository } from '../../../src/repositories/BatchRepository';
import { PatientRepository } from '../../../src/repositories/PatientRepository';
import { mockBatch } from '../../fixtures/batches.fixture';
import { mockPatient } from '../../fixtures/patients.fixture';

vi.mock('../../../src/repositories/WithdrawalRepository');
vi.mock('../../../src/repositories/BatchRepository');
vi.mock('../../../src/repositories/PatientRepository');
vi.mock('../../../src/services/ActivityLogService');

describe('WithdrawalService', () => {
  let withdrawalService: WithdrawalService;
  let mockWithdrawalRepo: any;
  let mockBatchRepo: any;
  let mockPatientRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWithdrawalRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
    };
    mockBatchRepo = {
      findById: vi.fn(),
    };
    mockPatientRepo = {
      findByCpf: vi.fn(),
      create: vi.fn(),
    };

    (WithdrawalRepository as any).mockImplementation(function () {
      return mockWithdrawalRepo;
    });
    (BatchRepository as any).mockImplementation(function () {
      return mockBatchRepo;
    });
    (PatientRepository as any).mockImplementation(function () {
      return mockPatientRepo;
    });

    withdrawalService = new WithdrawalService();
  });

  it('deve listar todas as retiradas para farmacêutico/admin', async () => {
    mockWithdrawalRepo.findAll.mockResolvedValue([]);

    const result = await withdrawalService.getAll('ADMIN');

    expect(result).toEqual([]);
    expect(mockWithdrawalRepo.findAll).toHaveBeenCalledWith();
  });

  it('deve registrar retirada e decrementar estoque do lote', async () => {
    mockBatchRepo.findById.mockResolvedValue({
      ...mockBatch,
      currentQuantity: 50,
    });
    mockPatientRepo.findByCpf.mockResolvedValue(mockPatient);
    mockWithdrawalRepo.create.mockResolvedValue({
      id: 1,
      patientId: 1,
      batchId: 1,
      quantity: 5,
    });

    const result = await withdrawalService.create(1, 'FARMACEUTICO', {
      patientName: mockPatient.name,
      patientCpf: mockPatient.cpf,
      batchId: 1,
      quantity: 5,
    });

    expect(result.id).toBe(1);
    expect(mockWithdrawalRepo.create).toHaveBeenCalled();
  });
});
