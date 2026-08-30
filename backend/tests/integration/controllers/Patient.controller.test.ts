import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PatientController } from '../../../src/controllers/PatientController';
import { PatientService } from '../../../src/services/PatientService';
import { mockPatient, mockPatientsList } from '../../fixtures/Patients.fixture';

vi.mock('../../../src/services/PatientService');

describe('PatientController Integration', () => {
  let patientController: PatientController;
  let mockPatientService: any;
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPatientService = {
      getAll: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    (PatientService as any).mockImplementation(function () {
      return mockPatientService;
    });

    patientController = new PatientController();

    mockReq = {
      user: { userId: 1, role: 'ADMIN' },
      params: {},
      body: {},
      query: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
  });

  it('deve retornar lista de pacientes', async () => {
    mockPatientService.getAll.mockResolvedValue(mockPatientsList);

    await patientController.getAll(mockReq, mockRes);

    expect(mockPatientService.getAll).toHaveBeenCalledWith('ADMIN', 1, undefined);
    expect(mockRes.json).toHaveBeenCalledWith(mockPatientsList);
  });

  it('deve buscar paciente por ID', async () => {
    mockReq.params.id = '1';
    mockPatientService.getById.mockResolvedValue(mockPatient);

    await patientController.getById(mockReq, mockRes);

    expect(mockPatientService.getById).toHaveBeenCalledWith(1, 'ADMIN', 1);
    expect(mockRes.json).toHaveBeenCalledWith(mockPatient);
  });
});