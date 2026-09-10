import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { generateToken } from '../../../src/utils/jwt';
import { Role } from '../../../src/types/enums';
import authRoutes from '../../../src/routes/auth-routes';
import withdrawalRoutes from '../../../src/routes/withdrawal-routes';
import disposalRoutes from '../../../src/routes/disposal-routes';
import { AuthService } from '../../../src/services/auth-service';
import { WithdrawalRepository } from '../../../src/repositories/withdrawal-repository';
import { prisma } from '../../../src/utils/prisma';

vi.mock('../../../src/utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe('Security and Defense in Depth Tests', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use('/api/withdrawals', withdrawalRoutes);
    app.use('/api/disposals', disposalRoutes);
  });

  describe('Autenticação e Anti-Enumeração', () => {
    it('deve retornar exatamente a mesma mensagem de erro para usuário inexistente e senha incorreta', async () => {
      const authService = new AuthService();
      const mockUserRepo = {
        findByEmail: vi.fn().mockResolvedValue(null),
      };
      (authService as any).userRepo = mockUserRepo;

      let nonExistentError: any = null;
      try {
        await authService.login('naoexiste@farmacia.ufba.br', 'senha123');
      } catch (err) {
        nonExistentError = err;
      }

      const mockExistingUser = {
        id: 1,
        email: 'existe@farmacia.ufba.br',
        password: '$2a$12$e8uq0wG64.gL1iZqBv1Yy.x38yvTq3kHek4vD3lO0G7Xm3z3T2O6m',
        active: true,
      };
      mockUserRepo.findByEmail.mockResolvedValue(mockExistingUser);

      let wrongPasswordError: any = null;
      try {
        await authService.login('existe@farmacia.ufba.br', 'senhaIncorreta');
      } catch (err) {
        wrongPasswordError = err;
      }

      expect(nonExistentError.statusCode).toBe(401);
      expect(wrongPasswordError.statusCode).toBe(401);
      expect(nonExistentError.message).toBe('Credenciais inválidas');
      expect(wrongPasswordError.message).toBe('Credenciais inválidas');
      expect(nonExistentError.message).toBe(wrongPasswordError.message);
    });

    it('deve retornar mensagem padronizada no cadastro sem revelar se email ou cpf já existem', async () => {
      const authService = new AuthService();
      const mockUserRepo = {
        findByEmail: vi.fn(),
      };
      const mockPatientRepo = {
        findByCpf: vi.fn(),
      };
      (authService as any).userRepo = mockUserRepo;
      (authService as any).patientRepo = mockPatientRepo;

      mockUserRepo.findByEmail.mockResolvedValue({ id: 1, email: 'usado@teste.com' });
      mockPatientRepo.findByCpf.mockResolvedValue(null);

      let emailConflictError: any = null;
      try {
        await authService.registerPatient({
          name: 'Teste',
          email: 'usado@teste.com',
          password: 'Password123',
          cpf: '12345678901',
        });
      } catch (err) {
        emailConflictError = err;
      }

      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockPatientRepo.findByCpf.mockResolvedValue({ id: 1, cpf: '12345678901' });

      let cpfConflictError: any = null;
      try {
        await authService.registerPatient({
          name: 'Teste',
          email: 'novo@teste.com',
          password: 'Password123',
          cpf: '12345678901',
        });
      } catch (err) {
        cpfConflictError = err;
      }

      expect(emailConflictError.statusCode).toBe(409);
      expect(cpfConflictError.statusCode).toBe(409);
      expect(emailConflictError.message).toBe('Dados cadastrais já em uso ou inválidos');
      expect(cpfConflictError.message).toBe('Dados cadastrais já em uso ou inválidos');
      expect(emailConflictError.message).toBe(cpfConflictError.message);
    });
  });

  describe('Sanitização de Entradas com Zod', () => {
    it('deve rejeitar requisições de login com email malformado via middleware Zod', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'email-invalido-sem-arroba',
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('deve rejeitar requisições de cadastro com senha menor que 6 caracteres via middleware Zod', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Usuario Teste',
          email: 'valido@teste.com',
          password: '123',
          cpf: '12345678901',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('deve rejeitar descarte com quantidade negativa ou não positiva', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 1,
        email: 'admin@farmacia.ufba.br',
        role: 'ADMIN',
        active: true,
        permissions: null,
      });

      const token = generateToken({ userId: 1, role: Role.ADMIN });

      const res = await request(app)
        .post('/api/disposals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          batchId: 1,
          quantity: -10,
          reason: 'Vencido',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Validação de JWT e RBAC', () => {
    it('deve rejeitar tokens adulterados com HTTP 401', async () => {
      const validToken = generateToken({ userId: 1, role: Role.ADMIN });
      const tamperedToken = `${validToken}violado`;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Token inválido ou expirado' });
    });

    it('deve rejeitar tokens assinados com algoritmo inseguro none com HTTP 401', async () => {
      const insecureToken = jwt.sign(
        { userId: 1, role: 'ADMIN' },
        '',
        { algorithm: 'none' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${insecureToken}`);

      expect(res.status).toBe(401);
    });

    it('deve proibir perfil PACIENTE de acessar rotas de descarte com HTTP 403', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 2,
        email: 'paciente@teste.com',
        role: 'PACIENTE',
        active: true,
        permissions: null,
        patient: { id: 10 },
      });

      const token = generateToken({ userId: 2, role: Role.PACIENTE, patientId: 10 });

      const res = await request(app)
        .get('/api/disposals')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Race Condition e Transações Atômicas de Estoque', () => {
    it('deve abortar a transação e impedir estoque negativo quando o saldo for insuficiente', async () => {
      const repo = new WithdrawalRepository();

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        const mockTx = {
          withdrawal: {
            create: vi.fn().mockResolvedValue({ id: 99 }),
          },
          stockBatch: {
            findUnique: vi.fn().mockResolvedValue({
              id: 1,
              currentQuantity: 2,
            }),
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          withdrawalItem: {
            create: vi.fn(),
          },
        };
        return callback(mockTx);
      });

      let errorThrown: any = null;
      try {
        await repo.create({
          patientId: 1,
          userId: 1,
          items: [{ batchId: 1, quantity: 5 }],
        });
      } catch (err) {
        errorThrown = err;
      }

      expect(errorThrown).toBeDefined();
      expect(errorThrown.statusCode).toBe(400);
      expect(errorThrown.message).toBe('Quantidade insuficiente em estoque para o lote informado');
    });

    it('deve abortar se concorrência decrementar o estoque simultaneamente', async () => {
      const repo = new WithdrawalRepository();

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        const mockTx = {
          withdrawal: {
            create: vi.fn().mockResolvedValue({ id: 99 }),
          },
          stockBatch: {
            findUnique: vi.fn().mockResolvedValue({
              id: 1,
              currentQuantity: 10,
            }),
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          withdrawalItem: {
            create: vi.fn(),
          },
        };
        return callback(mockTx);
      });

      let errorThrown: any = null;
      try {
        await repo.create({
          patientId: 1,
          userId: 1,
          items: [{ batchId: 1, quantity: 10 }],
        });
      } catch (err) {
        errorThrown = err;
      }

      expect(errorThrown).toBeDefined();
      expect(errorThrown.statusCode).toBe(400);
      expect(errorThrown.message).toBe('Estoque insuficiente no lote devido à concorrência de operações');
    });
  });
});
