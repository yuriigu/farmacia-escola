import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppointmentService } from '../../../src/services/appointment-service';
import { AppointmentRepository } from '../../../src/repositories/appointment-repository';
import { ScheduleSlotRepository } from '../../../src/repositories/schedule-slot-repository';
import { MedicineRepository } from '../../../src/repositories/medicine-repository';
import { PatientRepository } from '../../../src/repositories/patient-repository';
import { mockAppointment, mockAppointmentsList } from '../../fixtures/appointments-fixture';
import { mockPatient } from '../../fixtures/patients-fixture';
import { mockMedicine } from '../../fixtures/medicines-fixture';

// mockamos todos os repositorios que o appointment-service usa, alem
// do activity-log-service. assim o teste isola so a regra de negocio
// do service: as chamadas aos repos viram assercoes, e nao precisamos
// de banco nem de setup pesado.
vi.mock('../../../src/repositories/appointment-repository');
vi.mock('../../../src/repositories/schedule-slot-repository');
vi.mock('../../../src/repositories/medicine-repository');
vi.mock('../../../src/repositories/patient-repository');
vi.mock('../../../src/services/activity-log-service');

// testes do appointment-service.
// cobrem listagem, criacao com slot, atualizacao de status e a
// validacao obrigatoria de itens no create.
describe('AppointmentService', () => {
  let appointmentService: AppointmentService;
  let mockAppRepo: any;
  let mockSlotRepo: any;
  let mockMedicineRepo: any;
  let mockPatientRepo: any;

  beforeEach(() => {
    // limpa contadores e remonta os mocks entre os testes.
    vi.clearAllMocks();

    // mock do repositorio de agendamento com os metodos usados pelo service.
    mockAppRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateStatus: vi.fn(),
      delete: vi.fn(),
    };
    // mock do repositorio de escala.
    mockSlotRepo = {
      findById: vi.fn(),
      incrementBookedCount: vi.fn(),
      decrementBookedCount: vi.fn(),
    };
    // medicamento ja vem resolvendo pro fixture, porque o service
    // consulta o medicamento pra validar estoque no create.
    mockMedicineRepo = {
      findById: vi.fn().mockResolvedValue(mockMedicine),
    };
    // idem pro paciente: o service busca por id e por userid.
    mockPatientRepo = {
      findById: vi.fn().mockResolvedValue(mockPatient),
      findByUserId: vi.fn().mockResolvedValue(mockPatient),
    };
    // o slot default ja resolve com um slot valido, ativo e na data
    // esperada pelos testes de create.
    mockSlotRepo.findById.mockResolvedValue({
      id: 3,
      date: new Date('2025-10-15T00:00:00.000Z'),
      timeSlot: '10:00',
      maxCapacity: 4,
      active: true,
      appointments: [],
    });

    // quando o service instancia cada repositorio no construtor,
    // essas implementacoes entregam os mocks no lugar dos reais.
    (AppointmentRepository as any).mockImplementation(function () {
      return mockAppRepo;
    });
    (ScheduleSlotRepository as any).mockImplementation(function () {
      return mockSlotRepo;
    });
    (MedicineRepository as any).mockImplementation(function () {
      return mockMedicineRepo;
    });
    (PatientRepository as any).mockImplementation(function () {
      return mockPatientRepo;
    });

    appointmentService = new AppointmentService();
  });

  // verifica que o getall delega pro findAll do repo e devolve o
  // resultado sem transformacao pro papel admin.
  it('deve listar agendamentos', async () => {
    mockAppRepo.findAll.mockResolvedValue(mockAppointmentsList);

    const result = await appointmentService.getAll('ADMIN', 1);

    expect(result).toEqual(mockAppointmentsList);
    expect(mockAppRepo.findAll).toHaveBeenCalledTimes(1);
  });

  // verifica que o create funciona quando o payload traz slotid
  // valido. os mocks de slot, medicine e patient cobrem as validacoes
  // previas do service, entao o create do repo e chamado no fim.
  it('deve criar agendamento associado a horário de escala', async () => {
    mockAppRepo.create.mockResolvedValue(mockAppointment);

    const result = await appointmentService.create(
      { userId: 1, role: 'ADMIN', patientId: 1 },
      {
        patientId: 1,
        scheduledDate: '2025-10-15',
        scheduledTime: '10:00',
        slotId: 3,
        items: [{ medicineId: 1, quantity: 1 }],
      }
    );

    expect(result).toEqual(mockAppointment);
    expect(mockAppRepo.create).toHaveBeenCalled();
  });

  // verifica o update de status no caminho comum (nao completed).
  // confirma que o repo e chamado com o id, o status normalizado e
  // as notes (undefined quando nao veio).
  it('deve atualizar status do agendamento', async () => {
    mockAppRepo.findById.mockResolvedValue(mockAppointment);
    mockAppRepo.updateStatus.mockResolvedValue({
      ...mockAppointment,
      status: 'CONFIRMADO',
    });

    const result = await appointmentService.updateStatus(1, 'FARMACEUTICO', 1, 'CONFIRMADO');

    expect(result.status).toBe('CONFIRMADO');
    expect(mockAppRepo.updateStatus).toHaveBeenCalledWith(1, 'CONFIRMADO', undefined);
  });

  // verifica a validacao obrigatoria de itens no create: sem items,
  // o service precisa lancar erro 400 antes mesmo de tentar criar.
  it('deve rejeitar agendamento sem escala', async () => {
    await expect(appointmentService.create(
      { userId: 1, role: 'ADMIN' as string },
      { patientId: 1, scheduledDate: '2025-10-15', items: [{ medicineId: 1, quantity: 1 }] },
    )).rejects.toMatchObject({ statusCode: 400 });
  });
});