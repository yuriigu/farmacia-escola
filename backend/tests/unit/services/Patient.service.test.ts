import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PatientService } from '../../../src/services/PatientService';
import { PatientRepository } from '../../../src/repositories/PatientRepository';
import { mockPatient, mockPatientsList } from '../../fixtures/Patients.fixture';

vi.mock('../../../src/repositories/PatientRepository');
vi.mock('../../../src/services/ActivityLogService');

describe('PatientService', () => {
  let patientService: PatientService;
  let mockPatientRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPatientRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByCpf: vi.fn(),
      findByUserId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    (PatientRepository as any).mockImplementation(function () {
      return mockPatientRepo;
    });

    patientService = new PatientService();
  });

  it('deve listar pacientes', async () => {
    mockPatientRepo.findAll.mockResolvedValue(mockPatientsList);

    const result = await patientService.getAll('ADMIN', 1);

    expect(result).toEqual(mockPatientsList);
    expect(mockPatientRepo.findAll).toHaveBeenCalledTimes(1);
  });

  it('deve buscar paciente por ID', async () => {
    mockPatientRepo.findById.mockResolvedValue(mockPatient);

    const result = await patientService.getById(1, 'ADMIN', 1);

    expect(result).toEqual(mockPatient);
    expect(mockPatientRepo.findById).toHaveBeenCalledWith(1);
  });

  it('deve criar novo paciente com CPF único', async () => {
    mockPatientRepo.findByCpf.mockResolvedValue(null);
    mockPatientRepo.create.mockResolvedValue(mockPatient);

    const result = await patientService.create(1, 'FARMACEUTICO', {
      name: mockPatient.name,
      cpf: mockPatient.cpf,
      phone: mockPatient.phone,
    });

    expect(result).toEqual(mockPatient);
    expect(mockPatientRepo.create).toHaveBeenCalled();
  });

  it('deve lançar erro se CPF já estiver cadastrado', async () => {
    mockPatientRepo.findByCpf.mockResolvedValue(mockPatient);

    await expect(
      patientService.create(1, 'FARMACEUTICO', {
        name: 'Outro Paciente',
        cpf: mockPatient.cpf,
      })
    ).rejects.toEqual(expect.objectContaining({ statusCode: 409 }));
  });

  it('deve atualizar dados do paciente', async () => {
    mockPatientRepo.findById.mockResolvedValue(mockPatient);
    mockPatientRepo.update.mockResolvedValue({
      ...mockPatient,
      name: 'Maria Silva Atualizada',
    });

    const result = await patientService.update(1, 'FARMACEUTICO', 1, {
      name: 'Maria Silva Atualizada',
    });

    expect(result.name).toBe('Maria Silva Atualizada');
  });

  it('deve excluir paciente', async () => {
    mockPatientRepo.findById.mockResolvedValue(mockPatient);
    mockPatientRepo.delete.mockResolvedValue(mockPatient);

    const result = await patientService.delete(1, 'ADMIN', 1);

    expect(result).toBeDefined();
    expect(mockPatientRepo.delete).toHaveBeenCalledWith(1);
  });
});