import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MedicineRepository } from '../../../src/repositories/MedicineRepository';
import { prisma } from '../../../src/utils/Prisma';
import { mockMedicine, mockMedicinesList } from '../../fixtures/Medicines.fixture';

vi.mock('../../../src/utils/Prisma', () => ({
  prisma: {
    medicine: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('MedicineRepository', () => {
  let medicineRepo: MedicineRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    medicineRepo = new MedicineRepository();
  });

  it('deve listar todos os medicamentos com lotes', async () => {
    (prisma.medicine.findMany as any).mockResolvedValue(mockMedicinesList);

    const result = await medicineRepo.findAll();

    expect(result).toEqual(mockMedicinesList);
    expect(prisma.medicine.findMany).toHaveBeenCalled();
  });

  it('deve buscar medicamento por ID', async () => {
    (prisma.medicine.findUnique as any).mockResolvedValue(mockMedicine);

    const result = await medicineRepo.findById(1);

    expect(result).toEqual(mockMedicine);
    expect(prisma.medicine.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: { batches: true },
    });
  });

  it('deve criar medicamento', async () => {
    (prisma.medicine.create as any).mockResolvedValue(mockMedicine);

    const result = await medicineRepo.create({
      name: 'Paracetamol',
      dosage: '500mg',
    });

    expect(result).toEqual(mockMedicine);
    expect(prisma.medicine.create).toHaveBeenCalled();
  });

  it('deve deletar medicamento', async () => {
    (prisma.medicine.delete as any).mockResolvedValue(mockMedicine);

    const result = await medicineRepo.delete(1);

    expect(result).toEqual(mockMedicine);
    expect(prisma.medicine.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
