import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { generateToken } from '../../../src/utils/jwt';
import { prisma } from '../../../src/utils/prisma';
import { Role } from '../../../src/types/enums';
import { mockMedicine, mockMedicinesList } from '../../fixtures/medicines-fixture';

// mockamos o medicine-controller inteiro pra isolar a camada de rotas.
// o foco aqui e o pipeline http: se a rota existe, se passa pelos
// middlewares de auth, permissao e papel, e se a resposta sai com o
// status esperado. a logica de negocio (validacao, formatacao de
// dosagem, auditoria) nao entra.
vi.mock('../../../src/controllers/medicine-controller', () => {
  return {
    MedicineController: vi.fn().mockImplementation(function () {
      return {
        // cada metodo do controller falso so responde com um status
        // e um corpo fixo. serve pra checar se a rota chegou ate ele.
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

// mockamos o prisma porque o auth-middleware consulta o usuario pelo
// id do token pra confirmar que existe e esta ativo. aqui a gente
// so usa user.findunique.
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
import medicineRoutes from '../../../src/routes/medicine-routes';

// testes de integracao da camada de rotas de medicamento.
// cobrem o caminho feliz (listagem e criacao por admin) e o bloqueio
// por papel (paciente tentando criar). assim a gente valida os
// middlewares de auth e rbac alem das proprias rotas.
describe('Medicine Routes Integration', () => {
  let app: express.Express;
  let adminToken: string;

  beforeEach(() => {
    // limpa contadores entre testes.
    vi.clearAllMocks();

    // o auth-middleware consulta o usuario pelo id do token. o mock
    // responde de forma diferente conforme o id, pra ter dois papeis
    // disponiveis sem precisar de setup extra em cada teste.
    // - id 1: admin ativo
    // - id 3: paciente ativo com prontuario
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

    // token de admin gerado de verdade pra passar pelo auth-middleware.
    adminToken = generateToken({ userId: 1, role: Role.ADMIN });

    // monta um app express minimo so com o router de medicamento
    // sob o prefixo /api/medicines.
    app = express();
    app.use(express.json());
    app.use('/api/medicines', medicineRoutes);
  });

  // caminho feliz da listagem: admin com token valido, retorna 200
  // com a lista de medicamentos.
  it('GET /api/medicines - deve retornar lista de medicamentos', async () => {
    const res = await request(app)
      .get('/api/medicines')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(mockMedicinesList.length);
  });

  // caminho feliz da criacao: admin pode criar, entao 201 com o
  // medicamento.
  it('POST /api/medicines - deve criar medicamento para usuário com papel ADMIN', async () => {
    const res = await request(app)
      .post('/api/medicines')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Paracetamol', dosage: '500mg' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Paracetamol');
  });

  // caminho de bloqueio: paciente nao tem a permissao de criar
  // medicamento, entao a rota deve cortar com 403 antes de chegar
  // no controller. aqui e a prova de que o rbac esta ligado nas rotas.
  it('POST /api/medicines - deve barrar usuário com papel PACIENTE (403)', async () => {
    const patientToken = generateToken({ userId: 3, role: Role.PACIENTE });

    const res = await request(app)
      .post('/api/medicines')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ name: 'Paracetamol', dosage: '500mg' });

    expect(res.status).toBe(403);
  });
});