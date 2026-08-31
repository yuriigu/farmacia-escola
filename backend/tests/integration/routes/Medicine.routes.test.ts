import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { generateToken } from '../../../src/utils/Jwt';
import { prisma } from '../../../src/utils/Prisma';
import { mockMedicine, mockMedicinesList } from '../../fixtures/Medicines.fixture';

vi.mock('../../../src/controllers/MedicineController', () => {
  return {
    MedicineController: vi.fn().mockImplementation(function () {
      return {
        getAll: vi.fn(async (req: any, res: any) => {
          res.status(200).json(mockMedicinesList);
        }),
        getById: vi.fn(async (req: any, res: any) => {
          res.status(200).json(mockMedicine);
        }),
        create: vi.fn(async (req: any, res: any) => {
          res.status(201).json(mockMedicine);
        }),
        update: vi.fn(async (req: any, res: any) => {
          res.status(200).json(mockMedicine);
        }),
        delete: vi.fn(async (req: any, res: any) => {
          res.status(200).json({ message: 'Deleted' });
        }),
      };
    }),
  };
});

vi.mock('../../../src/utils/Prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import medicineRoutes from '../../../src/routes/MedicineRoutes';

describe('Medicine Routes Integration', () => {
  let app: express.Express;
  let adminToken: string;

  beforeEach(() => {
    vi.clearAllMocks();

    (prisma.user.findUnique as any).mockImplementation(({ where }: any) => {
      if (where.id === 1) {
        return Promise.resolve({
          id: 1,
          email: 'admin@farmacia.ufba.br',
          role: 'ADMIN',
          active: true,
          permissions: { medicines: true },
          patient: null,
        });
      }
      return Promise.resolve({
        id: 3,
        email: 'paciente@teste.com',
        role: 'PACIENTE',
        active: true,
        permissions: {},
        patient: { id: 1 },
      });
    });

    adminToken = generateToken({ userId: 1, role: 'ADMIN' });

    app = express();
    app.use(express.json());
    app.use('/api/medicines', medicineRoutes);
  });

  it('GET /api/medicines - deve retornar lista de medicamentos', async () => {
    const res = await request(app)
      .get('/api/medicines')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(mockMedicinesList.length);
  });

  it('POST /api/medicines - deve criar medicamento para usuário com papel ADMIN', async () => {
    const res = await request(app)
      .post('/api/medicines')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Paracetamol', dosage: '500mg' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Paracetamol');
  });

  it('POST /api/medicines - deve barrar usuário com papel PACIENTE (403)', async () => {
    const patientToken = generateToken({ userId: 3, role: 'PACIENTE' });

    const res = await request(app)
      .post('/api/medicines')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ name: 'Paracetamol', dosage: '500mg' });

    expect(res.status).toBe(403);
  });
});