import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { generateToken } from '../../../src/utils/Jwt';
import { prisma } from '../../../src/utils/Prisma';
import { mockAppointment, mockAppointmentsList } from '../../fixtures/Appointments.fixture';

vi.mock('../../../src/controllers/AppointmentController', () => {
  return {
    AppointmentController: vi.fn().mockImplementation(function () {
      return {
        getAll: vi.fn(async (req: any, res: any) => {
          res.status(200).json(mockAppointmentsList);
        }),
        getById: vi.fn(async (req: any, res: any) => {
          res.status(200).json(mockAppointment);
        }),
        create: vi.fn(async (req: any, res: any) => {
          res.status(201).json(mockAppointment);
        }),
        update: vi.fn(async (req: any, res: any) => {
          res.status(200).json(mockAppointment);
        }),
        updateStatus: vi.fn(async (req: any, res: any) => {
          res.status(200).json(mockAppointment);
        }),
        delete: vi.fn(async (req: any, res: any) => {
          res.status(200).json({ message: 'Deleted' });
        }),
      };
    }),
  };
});

vi.mock('../../../src/utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import appointmentRoutes from '../../../src/routes/AppointmentRoutes';

describe('Appointment Routes Integration', () => {
  let app: express.Express;
  let adminToken: string;

  beforeEach(() => {
    vi.clearAllMocks();

    (prisma.user.findUnique as any).mockResolvedValue({
      id: 1,
      email: 'admin@farmacia.ufba.br',
      role: 'ADMIN',
      active: true,
      permissions: {},
      patient: null,
    });

    adminToken = generateToken({ userId: 1, role: 'ADMIN' });

    app = express();
    app.use(express.json());
    app.use('/api/appointments', appointmentRoutes);
  });

  it('GET /api/appointments - deve listar agendamentos', async () => {
    const res = await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: 1 })]));
  });

  it('POST /api/appointments - deve criar agendamento', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patientId: 1,
        doctorId: 1,
        scheduledDate: '2025-10-15',
        scheduledTime: '10:00',
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(1);
  });
});