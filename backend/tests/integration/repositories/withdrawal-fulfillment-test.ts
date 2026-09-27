import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppointmentService } from '../../../src/services/appointment-service';
import { AppointmentRepository } from '../../../src/repositories/appointment-repository';
import { ActivityLogService } from '../../../src/services/activity-log-service';
import { prisma } from '../../../src/utils/prisma';

// testes de integracao do fluxo de dispensacao (withdrawal).
// no sistema atual a retirada e registrada como conclusao de um
// agendamento, entao o fluxo real vive no appointment-service:
// 1) updateStatus(..., 'COMPLETED') baixa o lote via fefo e conclui a
//    consulta dentro da mesma transacao
// 2) revertDispense devolve exatamente o saldo dispensado ao lote,
//    volta o status pra confirmed e registra auditoria
//
// obs: o antigo withdrawal-repository nao existe mais no src; o fluxo
// foi centralizado no appointment-service.
vi.mock('../../../src/repositories/appointment-repository');
vi.mock('../../../src/repositories/schedule-slot-repository');
vi.mock('../../../src/repositories/medicine-repository');
vi.mock('../../../src/repositories/patient-repository');
vi.mock('../../../src/services/activity-log-service');

describe('Withdrawal fulfillment', () => {
  let appointmentService: AppointmentService;
  let mockAppRepo: any;
  let mockLogService: any;

  beforeEach(() => {
    // limpa contadores e reinstancia o service entre os testes.
    vi.clearAllMocks();
    mockAppRepo = { findById: vi.fn() };
    mockLogService = { log: vi.fn().mockResolvedValue({ id: 1 }) };
    (AppointmentRepository as any).mockImplementation(function () {
      return mockAppRepo;
    });
    (ActivityLogService as any).mockImplementation(function () {
      return mockLogService;
    });
    appointmentService = new AppointmentService();
  });

  // verifica que a dispensacao, ao atender um agendamento pendente,
  // baixa o lote e tambem marca o agendamento como completed na mesma
  // transacao. o appointmentupdate captura o status pra checar depois.
  it('completa o agendamento pendente dentro da transacao FEFO', async () => {
    mockAppRepo.findById.mockResolvedValue({
      id: 7,
      patientId: 3,
      status: 'PENDING',
      notes: 'Retirada mensal',
      patient: { id: 3, name: 'Maria Silva', cpf: '12345678901' },
      items: [{ id: 21, appointmentId: 7, medicineId: 9, quantity: 2, batchId: null }],
    });

    const batch = {
      id: 20,
      medicineId: 9,
      batchNumber: 'LOTE-20',
      currentQuantity: 8,
      expirationDate: new Date('2099-01-01T00:00:00.000Z'),
      isBlocked: false,
    };

    // captura o update do agendamento pra validar status e lote.
    const appointmentUpdate = vi.fn(async (args: any) => ({
      id: args.where.id,
      status: args.data.status,
      batchId: args.data.batchId,
      items: [{ quantity: 2 }],
    }));
    const stockBatchUpdate = vi.fn().mockResolvedValue({ id: 20, currentQuantity: 6 });
    const stockMovementCreate = vi.fn().mockResolvedValue({ id: 1 });

    // mock do $transaction. devolve um tx fake com tudo que o fluxo de
    // fefo encosta: stockbatch, stockmovement, appointmentitem e
    // appointment.
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback({
      stockBatch: {
        findMany: vi.fn().mockResolvedValue([batch]),
        update: stockBatchUpdate,
      },
      stockMovement: { create: stockMovementCreate },
      appointmentItem: { update: vi.fn().mockResolvedValue({ id: 21 }) },
      appointment: { update: appointmentUpdate },
    }));

    const result = await appointmentService.updateStatus(4, 'FARMACEUTICO', 7, 'COMPLETED');

    // confirma que o agendamento virou completed.
    expect(appointmentUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 7 },
      data: expect.objectContaining({ status: 'COMPLETED' }),
    }));
    // confirma a baixa de 2 unidades no lote (8 -> 6).
    expect(stockBatchUpdate).toHaveBeenCalledWith({
      where: { id: 20 },
      data: { currentQuantity: 6 },
    });
    // confirma a movimentacao de dispensacao.
    expect(stockMovementCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'DISPENSE', quantity: 2 }),
    }));
    // confirma a quantidade que veio no resultado.
    expect(result.status).toBe('COMPLETED');
    expect(result.items[0].quantity).toBe(2);
    // e o log de auditoria da dispensacao.
    expect(mockLogService.log).toHaveBeenCalledWith(
      4,
      'update_status',
      'appointments',
      7,
      expect.stringContaining('COMPLETED')
    );
  });

  // verifica que o estorno devolve exatamente a quantidade dispensada
  // ao lote original, volta o agendamento pra confirmed com o motivo
  // e grava o log de auditoria. tudo dentro da mesma transacao.
  it('devolve exatamente o saldo dispensado ao cancelar', async () => {
    mockAppRepo.findById.mockResolvedValue({
      id: 11,
      patientId: 3,
      status: 'COMPLETED',
      batchId: 20,
      notes: null,
      patient: { id: 3, name: 'Maria Silva', cpf: '12345678901' },
      items: [{ id: 41, appointmentId: 11, medicineId: 9, quantity: 4, batchId: 20 }],
    });

    const stockBatchUpdate = vi.fn().mockResolvedValue({ id: 20, currentQuantity: 12 });
    const stockMovementCreate = vi.fn().mockResolvedValue({ id: 2 });
    const appointmentUpdate = vi.fn().mockResolvedValue({ id: 11, status: 'CONFIRMED' });

    // tx fake com o lote de origem e o agendamento concluido. e a
    // quantidade de 4 que precisa voltar pro lote 20 (8 -> 12).
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback({
      stockBatch: {
        findUnique: vi.fn().mockResolvedValue({ id: 20, currentQuantity: 8 }),
        update: stockBatchUpdate,
      },
      stockMovement: { create: stockMovementCreate },
      appointment: { update: appointmentUpdate },
    }));

    const result = await appointmentService.revertDispense(2, 'FARMACEUTICO', 11, 'Erro de separacao');

    // confirma a devolucao de saldo ao lote.
    expect(stockBatchUpdate).toHaveBeenCalledWith({
      where: { id: 20 },
      data: { currentQuantity: 12 },
    });
    // confirma a movimentacao de estorno.
    expect(stockMovementCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'REVERT', quantity: 4 }),
    }));
    // confirma o update do agendamento pra confirmed com o motivo.
    expect(appointmentUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 11 },
      data: expect.objectContaining({
        status: 'CONFIRMED',
        dispensedByUserId: null,
        dispensedAt: null,
        notes: expect.stringContaining('Motivo: Erro de separacao'),
      }),
    }));
    // confirma o log de auditoria com acao, entidade e id.
    expect(mockLogService.log).toHaveBeenCalledWith(
      2,
      'revert_dispense',
      'appointments',
      11,
      expect.stringContaining('Erro de separacao')
    );
    // confirma o status final devolvido.
    expect(result.status).toBe('CONFIRMED');
  });
});
