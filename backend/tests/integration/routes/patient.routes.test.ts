import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { generateToken } from '../../../src/utils/jwt';
import { prisma } from '../../../src/utils/prisma';
import { mockPatient, mockPatientsList } from '../../fixtures/patients.fixture';

vi.mock('../../../src/controllers/PatientController', () => {
  return {
    PatientController: vi.fn().mockImplementation(function () {
      return {
        getAll: vi.fn(async (req: any, res: any) => {
          res.status(200).json(mockPatientsList);
        }),
        getById: vi.fn(async (req: any, res: any) => {
          res.status(200).json(mockPatient);
        }),
        create: vi.fn(async (req: any, res: any) => {
          res.status(201).json(mockPatient);
        }),
        update: vi.fn(async (req: any, res: any) => {
          res.status(200).json(mockPatient);
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

import patientRoutes from '../../../src/routes/patientRoutes';

describe('Patient Routes Integration', () => {
  let app: express.Express;
  let adminToken: string;

  beforeEach(() => {
    vi.clearAllMocks();

    (prisma.user.findUnique as any).mockResolvedValue({
      id: 1,
      email: 'admin@farmacia.ufba.br',
      role: 'ADMIN',
      active: true,
      permissions: { patients: true },
      patient: null,
    });

    adminToken = generateToken({ userId: 1, role: 'ADMIN' });

    app = express();
    app.use(express.json());
    app.use('/api/patients', patientRoutes);
  });

  it('GET /api/patients - deve retornar lista de pacientes', async () => {
    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(mockPatientsList.length);
  });

  it('POST /api/patients - deve criar paciente com token de ADMIN', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Maria Silva Santos', cpf: '12345678901' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe(mockPatient.name);
  });
});
