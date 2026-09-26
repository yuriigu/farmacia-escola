import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { generateToken } from '../../../src/utils/jwt';
import { prisma } from '../../../src/utils/prisma';
import { mockPatient, mockPatientsList } from '../../fixtures/patients-fixture';

// mockamos o patient-controller inteiro pra isolar a camada de rotas.
// o foco aqui e o pipeline http: se a rota existe, se passa pelo
// middleware de auth e permissao, e se a resposta sai com o status
// esperado. a logica de negocio (validacao de cpf, soft delete) fica
// de fora.
vi.mock('../../../src/controllers/patient-controller', () => {
  return {
    PatientController: vi.fn().mockImplementation(function () {
      return {
        // cada metodo do controller falso responde com um status e
        // um corpo fixo. serve pra checar se a rota chegou ate ele.
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

// mockamos o prisma porque o auth-middleware consulta o usuario pelo
// id do token pra confirmar que existe e esta ativo. so o metodo
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
import patientRoutes from '../../../src/routes/patient-routes';

// testes de integracao da camada de rotas de paciente.
// sobem um app express minimo com o router real, mockam o controller
// e o prisma, e batem no endpoint via supertest. cobrem a listagem
// e a criacao com token de admin.
describe('Patient Routes Integration', () => {
  let app: express.Express;
  let adminToken: string;

  beforeEach(() => {
    // limpa contadores entre testes.
    vi.clearAllMocks();

    // o auth-middleware consulta o usuario pelo id do token. mockamos
    // pra devolver um admin ativo com permissao de pacientes.
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 1,
      email: 'admin@farmacia.ufba.br',
      role: 'ADMIN',
      active: true,
      permissions: { patients: true },
      patient: null,
    });

    // token de admin gerado de verdade pra passar pelo auth-middleware.
    adminToken = generateToken({ userId: 1, role: 'ADMIN' });

    // monta um app express minimo so com o router de paciente
    // sob o prefixo /api/patients.
    app = express();
    app.use(express.json());
    app.use('/api/patients', patientRoutes);
  });

  // caminho feliz da listagem: admin com token valido, retorna 200
  // com a lista de pacientes.
  it('GET /api/patients - deve retornar lista de pacientes', async () => {
    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(mockPatientsList.length);
  });

  // caminho feliz da criacao: admin pode criar paciente, entao 201
  // com o paciente criado.
  it('POST /api/patients - deve criar paciente com token de ADMIN', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Maria Silva Santos', cpf: '12345678901' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe(mockPatient.name);
  });
});