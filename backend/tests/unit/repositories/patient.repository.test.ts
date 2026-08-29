import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PatientRepository } from '../../../src/repositories/PatientRepository';
import { prisma } from '../../../src/utils/prisma';
import { mockPatient, mockPatientsList } from '../../fixtures/patients.fixture';

vi.mock('../../../src/utils/prisma', () => ({
  prisma: {
    patient: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('PatientRepository', () => {
  let patientRepo: PatientRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    patientRepo = new PatientRepository();
  });

  it('deve listar pacientes', async () => {
    (prisma.patient.findMany as any).mockResolvedValue(mockPatientsList);

    const result = await patientRepo.findAll();

    expect(result).toEqual(mockPatientsList);
    expect(prisma.patient.findMany).toHaveBeenCalled();
  });

  it('deve buscar paciente por CPF', async () => {
    (prisma.patient.findUnique as any).mockResolvedValue(mockPatient);

    const result = await patientRepo.findByCpf('12345678901');

    expect(result).toEqual(mockPatient);
    expect(prisma.patient.findUnique).toHaveBeenCalledWith({
      where: { cpf: '12345678901' },
    });
  });

  it('deve criar paciente', async () => {
    (prisma.patient.create as any).mockResolvedValue(mockPatient);

    const result = await patientRepo.create({
      name: 'Maria Silva',
      cpf: '12345678901',
    });

    expect(result).toEqual(mockPatient);
    expect(prisma.patient.create).toHaveBeenCalled();
  });
});
