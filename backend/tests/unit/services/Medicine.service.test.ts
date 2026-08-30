import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MedicineService } from '../../../src/services/MedicineService';
import { MedicineRepository } from '../../../src/repositories/MedicineRepository';
import { mockMedicine, mockMedicinesList } from '../../fixtures/Medicines.fixture';

vi.mock('../../../src/repositories/MedicineRepository');
vi.mock('../../../src/services/ActivityLogService');

describe('MedicineService', () => {
  let medicineService: MedicineService;
  let mockMedicineRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMedicineRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    (MedicineRepository as any).mockImplementation(function () {
      return mockMedicineRepo;
    });

    medicineService = new MedicineService();
  });

  it('deve listar todos os medicamentos', async () => {
    mockMedicineRepo.findAll.mockResolvedValue(mockMedicinesList);

    const result = await medicineService.getAll();

    expect(result).toHaveLength(mockMedicinesList.length);
    expect(mockMedicineRepo.findAll).toHaveBeenCalledTimes(1);
  });

  it('deve buscar medicamento por ID', async () => {
    mockMedicineRepo.findById.mockResolvedValue(mockMedicine);

    const result = await medicineService.getById(1);

    expect(result).toBeDefined();
    expect(result.id).toBe(1);
    expect(mockMedicineRepo.findById).toHaveBeenCalledWith(1);
  });

  it('deve lançar erro se medicamento não for encontrado', async () => {
    mockMedicineRepo.findById.mockResolvedValue(null);

    await expect(medicineService.getById(999)).rejects.toEqual(
      expect.objectContaining({ statusCode: 404 })
    );
  });

  it('deve criar medicamento com sucesso', async () => {
    mockMedicineRepo.create.mockResolvedValue(mockMedicine);

    const result = await medicineService.create(1, 'FARMACEUTICO', {
      name: 'Paracetamol',
      dosage: '500mg',
    });

    expect(result).toEqual(mockMedicine);
    expect(mockMedicineRepo.create).toHaveBeenCalled();
  });

  it('deve atualizar medicamento com sucesso', async () => {
    mockMedicineRepo.findById.mockResolvedValue(mockMedicine);
    mockMedicineRepo.update.mockResolvedValue({
      ...mockMedicine,
      name: 'Paracetamol Alterado',
    });

    const result = await medicineService.update(1, 'FARMACEUTICO', 1, {
      name: 'Paracetamol Alterado',
    });

    expect(result.name).toBe('Paracetamol Alterado');
    expect(mockMedicineRepo.update).toHaveBeenCalled();
  });

  it('deve excluir medicamento', async () => {
    mockMedicineRepo.findById.mockResolvedValue(mockMedicine);
    mockMedicineRepo.delete.mockResolvedValue(mockMedicine);

    const result = await medicineService.delete(1, 'ADMIN', 1);

    expect(result).toBeDefined();
    expect(mockMedicineRepo.delete).toHaveBeenCalledWith(1);
  });
});