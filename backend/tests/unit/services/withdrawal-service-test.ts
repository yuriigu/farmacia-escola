import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppointmentService } from '../../../src/services/appointment-service';
import { AppointmentRepository } from '../../../src/repositories/appointment-repository';
import { prisma } from '../../../src/utils/prisma';
import { mockBatch } from '../../fixtures/batches-fixture';
import { mockPatient } from '../../fixtures/patients-fixture';

// mockamos os repositorios que o appointment-service usa e o
// activity-log-service pra isolar a regra de negocio da dispensacao.
// os testes aqui cobrem o caminho basico: listar (pra equipe) e
// registrar uma retirada com baixa no lote escolhido.
//
// obs: no sistema atual a retirada e registrada concluindo um
// agendamento (updateStatus/COMPLETED), entao o antigo
// withdrawal-service nao existe mais no src.
vi.mock('../../../src/repositories/appointment-repository');
vi.mock('../../../src/repositories/schedule-slot-repository');
vi.mock('../../../src/repositories/medicine-repository');
vi.mock('../../../src/repositories/patient-repository');
vi.mock('../../../src/services/activity-log-service');

// testes do fluxo de retirada no appointment-service.
describe('WithdrawalService', () => {
  let appointmentService: AppointmentService;
  let mockAppRepo: any;

  beforeEach(() => {
    // limpa contadores entre testes.
    vi.clearAllMocks();

    // mock do repositorio de agendamento com os metodos que o service usa.
    mockAppRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
    };

    // quando o service instancia cada repositorio, essa implementacao
    // entrega o mock no lugar.
    (AppointmentRepository as any).mockImplementation(function () {
      return mockAppRepo;
    });

    appointmentService = new AppointmentService();
  });

  // verifica que o getall, chamado com papel admin, delega pro findall
  // do repo sem filtros extras.
  it('deve listar todas as retiradas para farmacêutico/admin', async () => {
    mockAppRepo.findAll.mockResolvedValue([]);

    const result = await appointmentService.getAll('ADMIN', 1);

    expect(result).toEqual([]);
    expect(mockAppRepo.findAll).toHaveBeenCalledWith(undefined);
  });

  // caminho feliz do create/dispensa: o lote existe, o paciente do
  // agendamento e resolvido, e o service baixa a quantidade do lote
  // escolhido dentro da transacao, concluindo a consulta.
  // a logica de fefo automatico fica coberta em outros testes.
  it('deve registrar retirada e decrementar estoque do lote', async () => {
    mockAppRepo.findById.mockResolvedValue({
      id: 5,
      patientId: mockPatient.id,
      status: 'PENDING',
      notes: null,
      patient: mockPatient,
      items: [{ id: 51, appointmentId: 5, medicineId: 1, quantity: 5, batchId: null }],
    });

    const batch = {
      ...mockBatch,
      id: 1,
      medicineId: 1,
      currentQuantity: 50,
      expirationDate: new Date('2099-12-31T00:00:00.000Z'),
      isBlocked: false,
    };
    const stockBatchUpdate = vi.fn().mockResolvedValue({ id: 1, currentQuantity: 45 });
    const appointmentItemUpdate = vi.fn().mockResolvedValue({ id: 51 });

    // o lote escolhido manualmente (batchid 1) e validado e debitado
    // dentro da transacao; o item do agendamento fica amarrado a ele.
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback({
      stockBatch: {
        findUnique: vi.fn().mockResolvedValue(batch),
        update: stockBatchUpdate,
      },
      stockMovement: { create: vi.fn().mockResolvedValue({ id: 1 }) },
      appointmentItem: { update: appointmentItemUpdate },
      appointment: {
        update: vi.fn(async (args: any) => ({ id: args.where.id, status: args.data.status })),
      },
    }));

    const result = await appointmentService.updateStatus(
      1,
      'FARMACEUTICO',
      5,
      'COMPLETED',
      undefined,
      [{ medicineId: 1, batchId: 1, quantity: 5 }]
    );

    // confirma a baixa de 5 unidades no lote (50 -> 45).
    expect(stockBatchUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { currentQuantity: 45 },
    });
    // confirma o vinculo do item com o lote escolhido.
    expect(appointmentItemUpdate).toHaveBeenCalledWith({
      where: { id: 51 },
      data: { batchId: 1 },
    });
    expect(result.id).toBe(5);
    expect(result.status).toBe('COMPLETED');
  });
});
