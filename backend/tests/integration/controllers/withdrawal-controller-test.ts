import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppointmentController } from '../../../src/controllers/appointment-controller';
import { AppointmentService } from '../../../src/services/appointment-service';

// mockamos o appointment-service pra isolar o controller.
// o foco aqui e o comportamento http dos endpoints de retirada:
// a listagem, a dispensacao (completed) e o estorno.
//
// obs: no sistema atual a retirada e feita via endpoints de agendamento
// (dispense / revertDispense), entao os antigos withdrawal-controller e
// withdrawal-service nao existem mais no src.
vi.mock('../../../src/services/appointment-service');
vi.mock('../../../src/services/activity-log-service');

// testes de integracao do controller de dispensacao/retirada.
describe('WithdrawalController Integration', () => {
  let appointmentController: AppointmentController;
  let mockAppointmentService: any;

  beforeEach(() => {
    // limpa contagem de chamadas entre testes pra nao vazar estado.
    vi.clearAllMocks();

    // mock do service com os metodos que o controller usa.
    mockAppointmentService = {
      getAll: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      dispense: vi.fn(),
      revertDispense: vi.fn(),
    };

    // quando o controller instancia o appointmentservice no construtor,
    // essa implementacao entrega o nosso mock no lugar.
    (AppointmentService as any).mockImplementation(function () {
      return mockAppointmentService;
    });
    appointmentController = new AppointmentController();
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

    mockAppointmentService.getAll.mockResolvedValue([]);

    await appointmentController.getAll(mockReq, mockRes);

    expect(mockAppointmentService.getAll).toHaveBeenCalledWith('ADMIN', 1, undefined);
    expect(mockRes.json).toHaveBeenCalledWith([]);
  });

  // verifica o fluxo de dispensacao: o controller deve chamar o service
  // forcando o status completed e repassando a nota, e responder 200
  // com o objeto dispensado.
  it('deve dispensar retirada com status completed', async () => {
    const mockReq = {
      user: { userId: 1, role: 'FARMACEUTICO' },
      params: { id: '1' },
      body: { notes: 'Dispensação supervisionada' },
    } as any;
    const mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as any;

    mockAppointmentService.updateStatus.mockResolvedValue({ id: 1, status: 'COMPLETED' });

    await appointmentController.dispense(mockReq, mockRes);

    // confirma que o service foi chamado com o alvo completed.
    expect(mockAppointmentService.updateStatus).toHaveBeenCalledWith(
      1,
      'FARMACEUTICO',
      1,
      'COMPLETED',
      'Dispensação supervisionada',
      undefined
    );
    expect(mockRes.json).toHaveBeenCalledWith({ id: 1, status: 'COMPLETED' });
  });

  // verifica o fluxo de estorno: o controller valida o motivo e delega
  // pro service, respondendo com o agendamento devolvido ao estoque.
  it('deve estornar retirada com motivo', async () => {
    const mockReq = {
      user: { userId: 2, role: 'ADMIN' },
      params: { id: '11' },
      body: { reason: 'Erro de separacao' },
    } as any;
    const mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as any;

    mockAppointmentService.revertDispense.mockResolvedValue({ id: 11, status: 'CONFIRMED' });

    await appointmentController.revertDispense(mockReq, mockRes);

    expect(mockAppointmentService.revertDispense).toHaveBeenCalledWith(2, 'ADMIN', 11, 'Erro de separacao');
    expect(mockRes.json).toHaveBeenCalledWith({ id: 11, status: 'CONFIRMED' });
  });
});
