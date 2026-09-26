import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WithdrawalService } from '../../../src/services/withdrawal-service';
import { WithdrawalRepository } from '../../../src/repositories/withdrawal-repository';
import { BatchRepository } from '../../../src/repositories/batch-repository';
import { PatientRepository } from '../../../src/repositories/patient-repository';
import { mockBatch } from '../../fixtures/batches-fixture';
import { mockPatient } from '../../fixtures/patients-fixture';

// mockamos os tres repositorios que o withdrawal-service usa e o
// activity-log-service pra isolar a regra de negocio da dispensacao.
// os testes aqui cobrem o caminho basico: listar (pra equipe) e
// criar uma retirada. a logica de fefo e o fluxo de cancelamento
// ficam cobertos em outros testes (repositorio e fluxo de cancel).
vi.mock('../../../src/repositories/withdrawal-repository');
vi.mock('../../../src/repositories/batch-repository');
vi.mock('../../../src/repositories/patient-repository');
vi.mock('../../../src/services/activity-log-service');

// testes do withdrawal-service.
// o foco aqui e a delegacao pro repositorio e a orquestracao basica
// do create (checar lote, resolver paciente por cpf, criar retirada).
describe('WithdrawalService', () => {
  let withdrawalService: WithdrawalService;
  let mockWithdrawalRepo: any;
  let mockBatchRepo: any;
  let mockPatientRepo: any;

  beforeEach(() => {
    // limpa contadores entre testes.
    vi.clearAllMocks();

    // mock dos tres repositorios que o service instancia no construtor.
    mockWithdrawalRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
    };
    mockBatchRepo = {
      findById: vi.fn(),
    };
    mockPatientRepo = {
      findByCpf: vi.fn(),
      create: vi.fn(),
    };

    // quando o service instancia cada repositorio, essas implementacoes
    // entregam os mocks no lugar.
    (WithdrawalRepository as any).mockImplementation(function () {
      return mockWithdrawalRepo;
    });
    (BatchRepository as any).mockImplementation(function () {
      return mockBatchRepo;
    });
    (PatientRepository as any).mockImplementation(function () {
      return mockPatientRepo;
    });

    withdrawalService = new WithdrawalService();
  });

  // verifica que o getall, chamado com papel admin, delega pro findall
  // do repo sem filtros extras.
  it('deve listar todas as retiradas para farmacêutico/admin', async () => {
    mockWithdrawalRepo.findAll.mockResolvedValue([]);

    const result = await withdrawalService.getAll('ADMIN');

    expect(result).toEqual([]);
    expect(mockWithdrawalRepo.findAll).toHaveBeenCalledWith();
  });

  // caminho feliz do create: o lote existe, o paciente e resolvido
  // pelo cpf, e o repo devolve a retirada criada. o service orquestra
  // tudo isso, mas a baixa efetiva no estoque fica no repositorio.
  it('deve registrar retirada e decrementar estoque do lote', async () => {
    mockBatchRepo.findById.mockResolvedValue({
      ...mockBatch,
      currentQuantity: 50,
    });
    mockPatientRepo.findByCpf.mockResolvedValue(mockPatient);
    mockWithdrawalRepo.create.mockResolvedValue({
      id: 1,
      patientId: 1,
      batchId: 1,
      quantity: 5,
    });

    const result = await withdrawalService.create(1, 'FARMACEUTICO', {
      patientName: mockPatient.name,
      patientCpf: mockPatient.cpf,
      batchId: 1,
      quantity: 5,
    });

    expect(result.id).toBe(1);
    expect(mockWithdrawalRepo.create).toHaveBeenCalled();
  });
});