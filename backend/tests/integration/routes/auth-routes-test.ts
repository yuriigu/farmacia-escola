import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { generateToken } from '../../../src/utils/jwt';
import { prisma } from '../../../src/utils/prisma';

// mockamos o auth-controller inteiro pra isolar a camada de rotas.
// o foco dos testes aqui e o pipeline http: se a rota existe, se o
// middleware de auth aplica nas rotas certas, e se a resposta sai com
// o status esperado. a logica de negocio (bcrypt, jwt, criacao de
// paciente) nao entra.
vi.mock('../../../src/controllers/auth-controller', () => {
  return {
    AuthController: vi.fn().mockImplementation(function () {
      return {
        // cada metodo do controller falso so responde com um status
        // e um corpo fixo. serve pra checar se a rota chegou ate ele.
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

// mockamos o prisma porque o auth-middleware consulta o usuario pelo
// id do token pra confirmar que ele existe e esta ativo. so
// user.findunique e usado nesse fluxo.
vi.mock('../../../src/utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// o import das rotas vem depois dos mocks de proposito. e assim que
// o vi.mock consegue interceptar o controller e o prisma antes de as
// rotas serem carregadas.
import authRoutes from '../../../src/routes/auth-routes';

// testes de integracao da camada de rotas de autenticacao.
// sobem um app express minimo com o router real, mockam o controller
// e o prisma, e batem no endpoint via supertest. os testes cobrem o
// login publico, o /me autenticado e o 401 sem token.
describe('Auth Routes Integration', () => {
  let app: express.Express;

  beforeEach(() => {
    // limpa contadores entre testes.
    vi.clearAllMocks();

    // o auth-middleware consulta o usuario pelo id do token. mockamos
    // pra devolver um admin ativo.
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 1,
      email: 'admin@farmacia.ufba.br',
      role: 'ADMIN',
      active: true,
      permissions: null,
      patient: null,
    });

    // monta um app express minimo so com o router de autenticacao
    // sob o prefixo /api/auth.
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  // login e rota publica: sem token, deve chegar no controller e
  // voltar 200 com o token mockado.
  it('POST /api/auth/login - deve realizar login com sucesso', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@farmacia.ufba.br', password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token', 'jwt-mock-token');
  });

  // /me exige token. aqui a gente gera um token de verdade (via
  // /utils/jwt) e confirma que o auth-middleware deixa passar e o
  // controller devolve o perfil.
  it('GET /api/auth/me - deve retornar perfil quando autenticado com Bearer token', async () => {
    const token = generateToken({ userId: 1, role: 'ADMIN' });

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('name', 'Admin');
  });

  // sem header authorization, o middleware corta antes de chegar no
  // controller e devolve 401.
  it('GET /api/auth/me - deve retornar 401 quando sem token', async () => {
    const response = await request(app).get('/api/auth/me');
    expect(response.status).toBe(401);
  });
});