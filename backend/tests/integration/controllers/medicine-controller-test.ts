import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MedicineController } from '../../../src/controllers/medicine-controller';
import { MedicineService } from '../../../src/services/medicine-service';
import { mockMedicine, mockMedicinesList } from '../../fixtures/medicines-fixture';

// mockamos o medicine-service pra isolar o controller.
// o foco dos testes e o comportamento http: o que o controller
// repassa pro service e como ele monta a resposta.
// o activity-log-service tambem e mockado porque o controller pode
// encostar nele indiretamente nos fluxos de escrita.
vi.mock('../../../src/services/medicine-service');
vi.mock('../../../src/services/activity-log-service');

// testes de integracao do medicine-controller.
// cobrem a listagem e a criacao (com status 201).
describe('MedicineController Integration', () => {
  let medController: MedicineController;
  let mockMedService: any;

  beforeEach(() => {
    // limpa contagem de chamadas entre testes pra nao vazar estado.
    vi.clearAllMocks();

    // mock do service com os metodos que o controller usa.
    // cada um e vi.fn() pra controlar o retorno e poder afirmar
    // o que foi chamado.
    mockMedService = {
      getAll: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    // quando o controller instancia o medicineservice no construtor,
    // essa implementacao entrega o nosso mock no lugar.
    (MedicineService as any).mockImplementation(function () {
      return mockMedService;
    });
    medController = new MedicineController();
  });

  // verifica que o getall delega pro service e devolve a lista
  // exatamente como veio, sem transformacao no controller.
  it('deve retornar lista de medicamentos', async () => {
    const mockReq = { user: { userId: 5, role: 'PACIENTE' }, query: {} } as any;
    const mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as any;

    mockMedService.getAll.mockResolvedValue(mockMedicinesList);

    await medController.getAll(mockReq, mockRes);

    // confirma que o service foi chamado e que a resposta saiu com
    // a lista certa.
    expect(mockMedService.getAll).toHaveBeenCalledWith('PACIENTE');
    expect(mockRes.json).toHaveBeenCalledWith(mockMedicinesList);
  });

  it('deve repassar o papel ao buscar um medicamento por ID', async () => {
    const mockReq = {
      user: { userId: 5, role: 'PACIENTE' },
      params: { id: '1' },
    } as any;
    const mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as any;
    mockMedService.getById.mockResolvedValue(mockMedicine);

    await medController.getById(mockReq, mockRes);

    expect(mockMedService.getById).toHaveBeenCalledWith(1, 'PACIENTE');
    expect(mockRes.json).toHaveBeenCalledWith(mockMedicine);
  });

  // verifica o fluxo de criacao: o controller deve chamar o service
  // e responder 201 com o medicamento criado.
  it('deve criar novo medicamento com status 201', async () => {
    const mockReq = {
      user: { userId: 1, role: 'FARMACEUTICO' },
      body: { name: 'Paracetamol', dosage: '500mg' },
    } as any;
    const mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as any;

    mockMedService.create.mockResolvedValue(mockMedicine);

    await medController.create(mockReq, mockRes);

    // confirma o status 201 e que a resposta trouxe o medicamento do mock.
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(mockMedicine);
  });
});