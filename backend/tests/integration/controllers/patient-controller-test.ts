import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PatientController } from '../../../src/controllers/patient-controller';
import { PatientService } from '../../../src/services/patient-service';
import { mockPatient, mockPatientsList } from '../../fixtures/patients-fixture';

// mockamos o patient-service pra isolar o controller.
// os testes aqui querem validar so o comportamento http: o que o
// controller repassa pro service (com quais argumentos) e como monta
// a resposta. a regra de negocio (validacao de cpf, soft delete, etc)
// fica de fora.
vi.mock('../../../src/services/patient-service');

// testes de integracao do patient-controller.
// usamos um mockreq e um mockres reutilizados, ajustados em cada
// teste conforme o cenario. cobre listagem e busca por id.
describe('PatientController Integration', () => {
  let patientController: PatientController;
  let mockPatientService: any;
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    // limpa contagem de chamadas entre testes pra nao vazar estado.
    vi.clearAllMocks();

    // mock do service com os metodos que o controller usa.
    mockPatientService = {
      getAll: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    // quando o controller instancia o patientservice no construtor,
    // essa implementacao entrega o nosso mock no lugar.
    (PatientService as any).mockImplementation(function () {
      return mockPatientService;
    });

    patientController = new PatientController();

    // req fake padrao. cada teste ajusta o que precisa (params, body, etc).
    mockReq = {
      user: { userId: 1, role: 'ADMIN' },
      params: {},
      body: {},
      query: {},
    };

    // res fake com status, json e send encadeaveis, pra cobrir os
    // fluxos que o controller usa.
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
  });

  // verifica que o getall passa papel e userid pro service e devolve
  // a lista como veio. o terceiro argumento (search) vai undefined
  // porque o req nao trouxe query.search.
  it('deve retornar lista de pacientes', async () => {
    mockPatientService.getAll.mockResolvedValue(mockPatientsList);

    await patientController.getAll(mockReq, mockRes);

    expect(mockPatientService.getAll).toHaveBeenCalledWith('ADMIN', 1, undefined);
    expect(mockRes.json).toHaveBeenCalledWith(mockPatientsList);
  });

  // verifica que o getbyid converte o id de string pra numero antes
  // de repassar pro service, junto com o papel e o userid.
  it('deve buscar paciente por ID', async () => {
    mockReq.params.id = '1';
    mockPatientService.getById.mockResolvedValue(mockPatient);

    await patientController.getById(mockReq, mockRes);

    expect(mockPatientService.getById).toHaveBeenCalledWith(1, 'ADMIN', 1);
    expect(mockRes.json).toHaveBeenCalledWith(mockPatient);
  });
});