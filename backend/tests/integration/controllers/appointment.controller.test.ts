import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppointmentController } from '../../../src/controllers/AppointmentController';
import { AppointmentService } from '../../../src/services/AppointmentService';
import { mockAppointment, mockAppointmentsList } from '../../fixtures/appointments.fixture';

vi.mock('../../../src/services/AppointmentService');
vi.mock('../../../src/services/ActivityLogService');

describe('AppointmentController Integration', () => {
  let appController: AppointmentController;
  let mockAppService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAppService = {
      getAll: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      cancel: vi.fn(),
      delete: vi.fn(),
    };
    (AppointmentService as any).mockImplementation(function () {
      return mockAppService;
    });
    appController = new AppointmentController();
  });

  it('deve listar agendamentos', async () => {
    const mockReq = { user: { userId: 1, role: 'ADMIN' }, query: {} } as any;
    const mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as any;

    mockAppService.getAll.mockResolvedValue(mockAppointmentsList);

    await appController.getAll(mockReq, mockRes);

    expect(mockAppService.getAll).toHaveBeenCalled();
    expect(mockRes.json).toHaveBeenCalledWith(mockAppointmentsList);
  });

  it('deve criar agendamento via controller', async () => {
    const mockReq = {
      user: { userId: 1, role: 'ADMIN' },
      body: { patientId: 1, scheduledDate: '2025-10-15', scheduledTime: '10:00' },
    } as any;
    const mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as any;

    mockAppService.create.mockResolvedValue(mockAppointment);

    await appController.create(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(mockAppointment);
  });
});
