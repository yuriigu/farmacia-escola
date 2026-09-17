import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { generateToken } from '../../../src/utils/jwt';
import { Role } from '../../../src/types/enums';
import authRoutes from '../../../src/routes/auth-routes';
import disposalRoutes from '../../../src/routes/disposal-routes';
import { AuthService } from '../../../src/services/auth-service';
import { prisma } from '../../../src/utils/prisma';
import { securityHeaders } from '../../../src/middlewares/security-headers-middleware';
import { errorMiddleware } from '../../../src/middlewares/error-middleware';
import { createRateLimiter } from '../../../src/middlewares/rate-limit-middleware';
import {
  appointmentUpdateStatusSchema,
  registerPatientSchema,
  userCreateSchema,
  userUpdateSchema,
} from '../../../src/middlewares/validation-middleware';

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

  describe('Cabecalhos de Seguranca HTTP', () => {
    it('deve aplicar cabecalhos de hardening e remover X-Powered-By nas respostas da API', async () => {
      const hardenedApp = express();
      hardenedApp.use(securityHeaders);
      hardenedApp.get('/ping', (req, res) => {
        res.json({ ok: true });
      });

      const res = await request(hardenedApp).get('/ping');

      expect(res.status).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['referrer-policy']).toBe('no-referrer');
      expect(res.headers['x-permitted-cross-domain-policies']).toBe('none');
      expect(res.headers['permissions-policy']).toContain('camera=()');
      expect(res.headers['content-security-policy']).toContain("default-src 'none'");
      expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('nao deve anunciar Strict-Transport-Security fora de producao', async () => {
      const hardenedApp = express();
      hardenedApp.use(securityHeaders);
      hardenedApp.get('/ping', (req, res) => {
        res.json({ ok: true });
      });

      const res = await request(hardenedApp).get('/ping');

      expect(res.headers['strict-transport-security']).toBeUndefined();
    });
  });

  describe('Vazamento de Dados em Respostas de Erro', () => {
    it('deve mascarar detalhes internos (ORM/SQL/caminhos) em erros 500', async () => {
      const failingApp = express();
      failingApp.get('/boom', () => {
        throw new Error('SQLITE_ERROR: no such table: main.User em /app/src/utils/prisma.ts (prisma.user.findMany)');
      });
      failingApp.use(errorMiddleware);

      const res = await request(failingApp).get('/boom');
      const serialized = JSON.stringify(res.body);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Erro interno no servidor' });
      expect(serialized).not.toContain('SQLITE_ERROR');
      expect(serialized).not.toContain('prisma');
      expect(serialized).not.toContain('/app/src');
      expect(res.body.stack).toBeUndefined();
    });

    it('deve preservar mensagens de erro de negocio (4xx) controladas pela aplicacao', async () => {
      const failingApp = express();
      failingApp.get('/forbidden', () => {
        const err: any = new Error('Origem não permitida pelo CORS');
        err.statusCode = 403;
        throw err;
      });
      failingApp.use(errorMiddleware);

      const res = await request(failingApp).get('/forbidden');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Origem não permitida pelo CORS');
      expect(res.body.stack).toBeUndefined();
    });
  });

  describe('Limitacao de Taxa nos Endpoints de Autenticacao', () => {
    it('deve bloquear tentativas repetidas com HTTP 429 e liberar apos a janela', async () => {
      let currentTime = 1000000;
      const limitedApp = express();
      limitedApp.use(express.json());
      limitedApp.use(createRateLimiter({
        windowMs: 60000,
        max: 2,
        now: () => currentTime,
      }));
      limitedApp.post('/api/auth/login', (req, res) => {
        res.status(200).json({ ok: true });
      });

      const first = await request(limitedApp).post('/api/auth/login').send({ email: 'a@b.com' });
      const second = await request(limitedApp).post('/api/auth/login').send({ email: 'a@b.com' });
      const third = await request(limitedApp).post('/api/auth/login').send({ email: 'a@b.com' });

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(third.status).toBe(429);
      expect(third.body).toHaveProperty('error');
      expect(Number(third.headers['retry-after'])).toBeGreaterThan(0);

      // APOS A JANELA DE 60s AS REQUISICOES VOLTAM A SER ACEITAS
      currentTime = currentTime + 61000;
      const afterWindow = await request(limitedApp).post('/api/auth/login').send({ email: 'a@b.com' });
      expect(afterWindow.status).toBe(200);
    });

    it('deve contabilizar tentativas por conta informada no corpo da requisicao', async () => {
      const limitedApp = express();
      limitedApp.use(express.json());
      limitedApp.use(createRateLimiter({
        windowMs: 60000,
        max: 1,
        keyGenerator: (req) => `conta:${String(req.body?.email ?? '').toLowerCase()}`,
      }));
      limitedApp.post('/api/auth/login', (req, res) => {
        res.status(200).json({ ok: true });
      });

      const aliceFirst = await request(limitedApp).post('/api/auth/login').send({ email: 'Alice@teste.com' });
      const aliceSecond = await request(limitedApp).post('/api/auth/login').send({ email: 'alice@teste.com' });
      const bobFirst = await request(limitedApp).post('/api/auth/login').send({ email: 'bob@teste.com' });

      expect(aliceFirst.status).toBe(200);
      expect(aliceSecond.status).toBe(429);
      expect(bobFirst.status).toBe(200);
    });
  });

  describe('Validacao Estrita de Tipos com Zod (antes do banco de dados)', () => {
    it('deve rejeitar payload de SQL Injection no login antes de qualquer consulta', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: "' OR 1=1 --", password: "' OR '1'='1" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('deve rejeitar chaves nao previstas no corpo (injecao de operadores)', () => {
      const withOperator = userUpdateSchema.safeParse({ name: 'Teste', $where: '1=1' });
      expect(withOperator.success).toBe(false);
    });

    it('deve aceitar apenas perfis conhecidos e normalizar a caixa', () => {
      const invalid = userCreateSchema.safeParse({
        name: 'Usuario Teste',
        email: 'usuario@teste.com',
        password: '123456',
        role: 'SUPERADMIN',
      });
      expect(invalid.success).toBe(false);

      const lowered = userCreateSchema.safeParse({
        name: 'Usuario Teste',
        email: 'usuario@teste.com',
        password: '123456',
        role: 'medico',
      });
      expect(lowered.success).toBe(true);
      if (lowered.success) {
        expect(lowered.data.role).toBe('MEDICO');
      }
    });

    it('deve aceitar apenas chaves de permissao conhecidas no mapa de permissoes', () => {
      const invalid = userUpdateSchema.safeParse({ permissions: { ROOT_ACCESS: true } });
      expect(invalid.success).toBe(false);

      const valid = userUpdateSchema.safeParse({ permissions: { USERS_READ: true, medicines: false } });
      expect(valid.success).toBe(true);
    });

    it('deve aceitar apenas status validos no ciclo de vida do agendamento', () => {
      const invalid = appointmentUpdateStatusSchema.safeParse({ status: 'PWNED' });
      expect(invalid.success).toBe(false);

      const normalized = appointmentUpdateStatusSchema.safeParse({ status: 'cancelled' });
      expect(normalized.success).toBe(true);
      if (normalized.success) {
        expect(normalized.data.status).toBe('CANCELLED');
      }

      const missing = appointmentUpdateStatusSchema.safeParse({});
      expect(missing.success).toBe(false);
      if (!missing.success) {
        expect(missing.error.issues[0].message).toBe('Status é obrigatório');
      }
    });

    it('deve rejeitar datas invalidas e CPFs sem 11 digitos no cadastro publico', () => {
      const badDate = registerPatientSchema.safeParse({
        name: 'Usuario Teste',
        email: 'usuario@teste.com',
        password: '123456',
        cpf: '123.456.789-01',
        birthDate: 'data-invalida',
      });
      expect(badDate.success).toBe(false);

      const badCpf = registerPatientSchema.safeParse({
        name: 'Usuario Teste',
        email: 'usuario@teste.com',
        password: '123456',
        cpf: '123',
      });
      expect(badCpf.success).toBe(false);

      const valid = registerPatientSchema.safeParse({
        name: 'Usuario Teste',
        email: 'usuario@teste.com',
        password: '123456',
        cpf: '123.456.789-01',
        birthDate: '1990-05-10',
      });
      expect(valid.success).toBe(true);
    });
  });
});

