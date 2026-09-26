import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WithdrawalController } from '../../../src/controllers/withdrawal-controller';
import { WithdrawalService } from '../../../src/services/withdrawal-service';

// mockamos o withdrawal-service pra isolar o controller.
// o foco aqui e o comportamento http: o que o controller repassa
// pro service e como ele responde. a regra de negocio (fefo, baixa
// no lote, transacao) fica de fora desses testes.
// o activity-log-service tambem e mockado porque o controller pode
// encostar nele indiretamente.
vi.mock('../../../src/services/withdrawal-service');
vi.mock('../../../src/services/activity-log-service');

// testes de integracao do withdrawal-controller.
// cobrem a listagem e a criacao (com status 201).
describe('WithdrawalController Integration', () => {
  let withdrawalController: WithdrawalController;
  let mockWithdrawalService: any;

  beforeEach(() => {
    // limpa contagem de chamadas entre testes pra nao vazar estado.
    vi.clearAllMocks();

    // mock do service com os metodos que o controller usa.
    mockWithdrawalService = {
      getAll: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
    };

    // quando o controller instancia o withdrawalservice no construtor,
    // essa implementacao entrega o nosso mock no lugar.
    (WithdrawalService as any).mockImplementation(function () {
      return mockWithdrawalService;
    });
    withdrawalController = new WithdrawalController();
  });

  // verifica que o getall delega pro service e devolve o que ele
  // retornar (aqui, uma lista vazia) sem transformacao no controller.
  // o req traz patientid null porque e o cenario de usuario da equipe
  // (sem prontuario proprio).
  it('deve listar retiradas', async () => {
    const mockReq = { user: { userId: 1, role: 'ADMIN', patientId: null } } as any;
    const mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as any;

    mockWithdrawalService.getAll.mockResolvedValue([]);

    await withdrawalController.getAll(mockReq, mockRes);

    expect(mockWithdrawalService.getAll).toHaveBeenCalled();
    expect(mockRes.json).toHaveBeenCalledWith([]);
  });

  // verifica o fluxo de criacao: o controller deve chamar o service
  // com o usuario e o payload, e responder 201 com o objeto criado.
  it('deve criar retirada com status 201', async () => {
    const mockReq = {
      user: { userId: 1, role: 'FARMACEUTICO' },
      body: { patientName: 'Maria', patientCpf: '12345678901', batchId: 1, quantity: 2 },
    } as any;
    const mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as any;

    mockWithdrawalService.create.mockResolvedValue({ id: 1, quantity: 2 });

    await withdrawalController.create(mockReq, mockRes);

    // confirma o status 201 e o corpo da resposta.
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({ id: 1, quantity: 2 });
  });
});