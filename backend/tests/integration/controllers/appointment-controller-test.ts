import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppointmentController } from '../../../src/controllers/appointment-controller';
import { AppointmentService } from '../../../src/services/appointment-service';
import { mockAppointment, mockAppointmentsList } from '../../fixtures/appointments-fixture';

// mockamos o appointment-service pra isolar o controller.
// a ideia do teste e so validar o que o controller faz (chamar o service,
// decidir status http e mandar a resposta), sem depender de banco nem
// de regra de negocio. o activity-log-service tambem e mockado porque
// o controller pode indiretamente encostar nele.
vi.mock('../../../src/services/appointment-service');
vi.mock('../../../src/services/activity-log-service');

// testes de integracao do appointment-controller.
// usamos mocks pros services e fixtures com dados fixos pra checar
// o comportamento do controller de ponta a ponta no nivel http.
describe('AppointmentController Integration', () => {
  let appController: AppointmentController;
  let mockAppService: any;

  beforeEach(() => {
    // limpa os mocks entre testes pra nao vazar contagem de chamadas
    // nem valores resolvidos de um caso pro outro.
    vi.clearAllMocks();

    // mock do service com os metodos que o controller usa. cada um e
    // um vi.fn() pra a gente poder afirmar o que foi chamado e controlar
    // o retorno.
    mockAppService = {
      getAll: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      cancel: vi.fn(),
      delete: vi.fn(),
    };
    // quando o controller instancia o appointmentservice no construtor,
    // essa implementacao devolve o nosso mock no lugar.
    (AppointmentService as any).mockImplementation(function () {
      return mockAppService;
    });
    appController = new AppointmentController();
  });

  // verifica que o getall delega pro service e devolve a lista
  // exatamente como veio, sem transformacao no controller.
  it('deve listar agendamentos', async () => {
    // req fake com usuario admin e query vazia.
    const mockReq = { user: { userId: 1, role: 'ADMIN' }, query: {} } as any;
    // res fake com json e status encadeaveis.
    const mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as any;

    mockAppService.getAll.mockResolvedValue(mockAppointmentsList);

    await appController.getAll(mockReq, mockRes);

    // confirma que o service foi chamado e que a resposta saiu com
    // a lista certa.
    expect(mockAppService.getAll).toHaveBeenCalled();
    expect(mockRes.json).toHaveBeenCalledWith(mockAppointmentsList);
  });

  // verifica o fluxo de criacao: o controller deve chamar o service
  // com o usuario e o payload, e responder 201 com o agendamento criado.
  it('deve criar agendamento via controller', async () => {
    const mockReq = {
      user: { userId: 1, role: 'ADMIN' },
      body: { patientId: 1, scheduledDate: '2025-10-15', scheduledTime: '10:00', slotId: 1, items: [{ medicineId: 1, quantity: 1 }] },
    } as any;
    const mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as any;

    mockAppService.create.mockResolvedValue(mockAppointment);

    await appController.create(mockReq, mockRes);

    // confirma o status 201 e que a resposta trouxe o agendamento do mock.
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(mockAppointment);
  });
});