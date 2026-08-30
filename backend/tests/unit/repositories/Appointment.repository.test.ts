import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppointmentRepository } from '../../../src/repositories/AppointmentRepository';
import { prisma } from '../../../src/utils/Prisma';
import { mockAppointment, mockAppointmentsList } from '../../fixtures/Appointments.fixture';

vi.mock('../../../src/utils/Prisma', () => ({
  prisma: {
    appointment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(async (cb: any) => {
      return cb({
        appointment: {
          create: vi.fn().mockResolvedValue(mockAppointment),
          findUnique: vi.fn().mockResolvedValue(mockAppointment),
        },
        appointmentItem: {
          create: vi.fn().mockResolvedValue({ id: 1 }),
        },
        scheduleSlot: {
          update: vi.fn(),
        },
      });
    }),
  },
}));

describe('AppointmentRepository', () => {
  let appRepo: AppointmentRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    appRepo = new AppointmentRepository();
  });

  it('deve listar agendamentos', async () => {
    (prisma.appointment.findMany as any).mockResolvedValue(mockAppointmentsList);

    const result = await appRepo.findAll();

    expect(result).toEqual(mockAppointmentsList);
    expect(prisma.appointment.findMany).toHaveBeenCalled();
  });

  it('deve buscar agendamento por ID', async () => {
    (prisma.appointment.findUnique as any).mockResolvedValue(mockAppointment);

    const result = await appRepo.findById(1);

    expect(result).toEqual(mockAppointment);
    expect(prisma.appointment.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: expect.any(Object),
    });
  });

  it('deve criar agendamento no banco com transação', async () => {
    const result = await appRepo.create({
      patientId: 1,
      scheduledDate: new Date('2025-10-15T10:00:00.000Z'),
      scheduledTime: '10:00',
      items: [{ medicineId: 1, quantity: 2 }],
    });

    expect(result).toEqual(mockAppointment);
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});