import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppointmentService } from '../../../src/services/AppointmentService';
import { AppointmentRepository } from '../../../src/repositories/AppointmentRepository';
import { ScheduleSlotRepository } from '../../../src/repositories/ScheduleSlotRepository';
import { MedicineRepository } from '../../../src/repositories/MedicineRepository';
import { PatientRepository } from '../../../src/repositories/PatientRepository';
import { mockAppointment, mockAppointmentsList } from '../../fixtures/appointments.fixture';
import { mockPatient } from '../../fixtures/patients.fixture';
import { mockMedicine } from '../../fixtures/medicines.fixture';

vi.mock('../../../src/repositories/AppointmentRepository');
vi.mock('../../../src/repositories/ScheduleSlotRepository');
vi.mock('../../../src/repositories/MedicineRepository');
vi.mock('../../../src/repositories/PatientRepository');
vi.mock('../../../src/services/ActivityLogService');

describe('AppointmentService', () => {
  let appointmentService: AppointmentService;
  let mockAppRepo: any;
  let mockSlotRepo: any;
  let mockMedicineRepo: any;
  let mockPatientRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAppRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateStatus: vi.fn(),
      delete: vi.fn(),
    };
    mockSlotRepo = {
      findById: vi.fn(),
      incrementBookedCount: vi.fn(),
      decrementBookedCount: vi.fn(),
    };
    mockMedicineRepo = {
      findById: vi.fn().mockResolvedValue(mockMedicine),
    };
    mockPatientRepo = {
      findById: vi.fn().mockResolvedValue(mockPatient),
      findByUserId: vi.fn().mockResolvedValue(mockPatient),
    };

    (AppointmentRepository as any).mockImplementation(function () {
      return mockAppRepo;
    });
    (ScheduleSlotRepository as any).mockImplementation(function () {
      return mockSlotRepo;
    });
    (MedicineRepository as any).mockImplementation(function () {
      return mockMedicineRepo;
    });
    (PatientRepository as any).mockImplementation(function () {
      return mockPatientRepo;
    });

    appointmentService = new AppointmentService();
  });

  it('deve listar agendamentos', async () => {
    mockAppRepo.findAll.mockResolvedValue(mockAppointmentsList);

    const result = await appointmentService.getAll('ADMIN', 1);

    expect(result).toEqual(mockAppointmentsList);
    expect(mockAppRepo.findAll).toHaveBeenCalledTimes(1);
  });

  it('deve criar agendamento associado a horário de escala', async () => {
    mockAppRepo.create.mockResolvedValue(mockAppointment);

    const result = await appointmentService.create(
      { userId: 1, role: 'ADMIN', patientId: 1 },
      {
        patientId: 1,
        scheduledDate: '2025-10-15',
        scheduledTime: '10:00',
        items: [{ medicineId: 1, quantity: 1 }],
      }
    );

    expect(result).toEqual(mockAppointment);
    expect(mockAppRepo.create).toHaveBeenCalled();
  });

  it('deve atualizar status do agendamento', async () => {
    mockAppRepo.findById.mockResolvedValue(mockAppointment);
    mockAppRepo.updateStatus.mockResolvedValue({
      ...mockAppointment,
      status: 'CONFIRMADO',
    });

    const result = await appointmentService.updateStatus(1, 'FARMACEUTICO', 1, 'CONFIRMADO');

    expect(result.status).toBe('CONFIRMADO');
    expect(mockAppRepo.updateStatus).toHaveBeenCalledWith(1, 'CONFIRMADO', undefined);
  });
});
