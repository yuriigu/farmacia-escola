import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { generateToken } from '../../../src/utils/Jwt';
import { prisma } from '../../../src/utils/Prisma';

vi.mock('../../../src/controllers/AuthController', () => {
  return {
    AuthController: vi.fn().mockImplementation(function () {
      return {
        login: vi.fn(async (req: any, res: any) => {
          res.status(200).json({ token: 'jwt-mock-token', user: { id: 1, email: 'admin@farmacia.ufba.br' } });
        }),
        me: vi.fn(async (req: any, res: any) => {
          res.status(200).json({ id: 1, name: 'Admin', role: 'ADMIN' });
        }),
        register: vi.fn(async (req: any, res: any) => {
          res.status(201).json({ id: 1 });
        }),
        updateProfile: vi.fn(async (req: any, res: any) => {
          res.status(200).json({ id: 1, name: 'Admin Updated' });
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

import authRoutes from '../../../src/routes/AuthRoutes';

describe('Auth Routes Integration', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();

    (prisma.user.findUnique as any).mockResolvedValue({
      id: 1,
      email: 'admin@farmacia.ufba.br',
      role: 'ADMIN',
      active: true,
      permissions: null,
      patient: null,
    });

    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  it('POST /api/auth/login - deve realizar login com sucesso', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@farmacia.ufba.br', password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token', 'jwt-mock-token');
  });

  it('GET /api/auth/me - deve retornar perfil quando autenticado com Bearer token', async () => {
    const token = generateToken({ userId: 1, role: 'ADMIN' });

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('name', 'Admin');
  });

  it('GET /api/auth/me - deve retornar 401 quando sem token', async () => {
    const response = await request(app).get('/api/auth/me');
    expect(response.status).toBe(401);
  });
});