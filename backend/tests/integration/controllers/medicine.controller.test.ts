import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MedicineController } from '../../../src/controllers/MedicineController';
import { MedicineService } from '../../../src/services/MedicineService';
import { mockMedicine, mockMedicinesList } from '../../fixtures/medicines.fixture';

vi.mock('../../../src/services/MedicineService');
vi.mock('../../../src/services/ActivityLogService');

describe('MedicineController Integration', () => {
  let medController: MedicineController;
  let mockMedService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMedService = {
      getAll: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    (MedicineService as any).mockImplementation(function () {
      return mockMedService;
    });
    medController = new MedicineController();
  });

  it('deve retornar lista de medicamentos', async () => {
    const mockReq = { query: {} } as any;
    const mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as any;

    mockMedService.getAll.mockResolvedValue(mockMedicinesList);

    await medController.getAll(mockReq, mockRes);

    expect(mockMedService.getAll).toHaveBeenCalled();
    expect(mockRes.json).toHaveBeenCalledWith(mockMedicinesList);
  });

  it('deve criar novo medicamento com status 201', async () => {
    const mockReq = {
      user: { userId: 1, role: 'FARMACEUTICO' },
      body: { name: 'Paracetamol', dosage: '500mg' },
    } as any;
    const mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as any;

    mockMedService.create.mockResolvedValue(mockMedicine);

    await medController.create(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(mockMedicine);
  });
});
