import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { generateToken } from '../../../src/utils/jwt';
import { prisma } from '../../../src/utils/prisma';
import { mockAppointment, mockAppointmentsList } from '../../fixtures/appointments-fixture';
import { Role } from '../../../src/types/enums';

// mockamos o appointment-controller inteiro pra isolar a camada de
// rotas. o foco dos testes aqui e testar o pipeline http: se a rota
// existe, se passa pelos middlewares de auth e permissao e se responde
// com o status esperado. a logica de negocio do controller nao entra.
vi.mock('../../../src/controllers/appointment-controller', () => {
  return {
    AppointmentController: vi.fn().mockImplementation(function () {
      return {
        // cada metodo do controller falso so devolve um status + o
        // mock certo. assim a gente sabe que a rota chegou ate o
        // controller se o status vier conforme esperado.
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
        dispense: vi.fn(async (req: any, res: any) => {
          res.status(200).json(mockAppointment);
        }),
        revertDispense: vi.fn(async (req: any, res: any) => {
          res.status(200).json(mockAppointment);
        }),
        delete: vi.fn(async (req: any, res: any) => {
          res.status(200).json({ message: 'Deleted' });
        }),
      };
    }),
  };
});

// mockamos o prisma tambem, porque o auth-middleware consulta o
// usuario pelo id do token pra confirmar que ele existe e esta ativo.
// so o metodo user.findunique e usado nesse fluxo.
vi.mock('../../../src/utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// o import das rotas vem depois dos mocks de proposito. e assim que
// o vi.mock consegue interceptar o controller e o prisma antes das
// rotas serem carregadas.
import appointmentRoutes from '../../../src/routes/appointment-routes';

// testes de integracao da camada de rotas de agendamento.
// sobem um app express minimo com o router real, mockam o controller
// e o prisma, e batem no endpoint via supertest. assim da pra validar
// os middlewares de auth (que sao o que realmente importa aqui).
describe('Appointment Routes Integration', () => {
  let app: express.Express;
  let adminToken: string;

  beforeEach(() => {
    // limpa contadores entre testes.
    vi.clearAllMocks();

    // o auth-middleware busca o usuario pelo id do token. mockamos
    // pra devolver um admin ativo com permissoes vazias (que, no caso
    // do admin, nao importam: admin passa em tudo pela matriz).
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 1,
      email: 'admin@farmacia.ufba.br',
      role: 'ADMIN',
      active: true,
      permissions: {},
      patient: null,
    });

    // geramos um token de verdade pro admin, pra passar pelo
    // auth-middleware sem gambiarra.
    adminToken = generateToken({ userId: 1, role: Role.ADMIN });

    // monta um app express minimo so com o router de agendamento
    // sob o prefixo /api/appointments.
    app = express();
    app.use(express.json());
    app.use('/api/appointments', appointmentRoutes);
  });

  // caminho feliz da listagem: com token de admin, deve chegar no
  // controller e voltar 200 com a lista.
  it('GET /api/appointments - deve listar agendamentos', async () => {
    const res = await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: 1 })]));
  });

  // caminho feliz da criacao: com token de admin, deve chegar no
  // controller e voltar 201 com o agendamento criado.
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

  // sem header authorization, o auth-middleware deve cortar antes
  // de chegar no controller e responder 401.
  it('GET /api/appointments - deve exigir token de autenticacao (HTTP 401)', async () => {
    const res = await request(app).get('/api/appointments');

    expect(res.status).toBe(401);
  });

  // token adulterado (assinatura invalida) deve cair no catch do
  // auth-middleware e voltar 401.
  it('GET /api/appointments - deve rejeitar token invalido (HTTP 401)', async () => {
    const res = await request(app)
      .get('/api/appointments')
      .set('Authorization', 'Bearer token-adulterado');

    expect(res.status).toBe(401);
  });

  // token valido mas sem o prefixo bearer deve ser tratado como
  // token ausente, porque o middleware exige o formato exato.
  it('GET /api/appointments - deve rejeitar token sem o prefixo Bearer (HTTP 401)', async () => {
    const res = await request(app)
      .get('/api/appointments')
      .set('Authorization', adminToken);

    expect(res.status).toBe(401);
  });
});