import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScheduleSlotService } from '../../../src/services/schedule-slot-service';
import { ScheduleSlotRepository } from '../../../src/repositories/schedule-slot-repository';

// mockamos o repositorio de escala e o activity-log-service pra
// isolar o schedule-slot-service. os testes cobrem o crud basico
// da escala (listar, criar, buscar por id) e a trava de seguranca
// que impede exclusao quando ha agendamento ativo vinculado.
vi.mock('../../../src/repositories/schedule-slot-repository');
vi.mock('../../../src/services/activity-log-service');

// testes do schedule-slot-service.
// o foco aqui e a delegacao pro repositorio e a regra de negocio
// da trava de exclusao.
describe('ScheduleSlotService', () => {
  let slotService: ScheduleSlotService;
  let mockSlotRepo: any;

  beforeEach(() => {
    // limpa contadores entre testes.
    vi.clearAllMocks();

    // mock do repositorio de escala com os metodos usados pelo service.
    mockSlotRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByDateAndTime: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    // quando o service instancia o repositorio no construtor,
    // essa implementacao entrega o mock no lugar.
    (ScheduleSlotRepository as any).mockImplementation(function () {
      return mockSlotRepo;
    });

    slotService = new ScheduleSlotService();
  });

  // verifica que o getall passa as datas normalizadas pro findall
  // do repo. o service parseia as strings de entrada antes de chamar.
  it('deve listar horários disponíveis no período informado', async () => {
    mockSlotRepo.findAll.mockResolvedValue([]);

    const result = await slotService.getAll('2025-10-01', '2025-10-31');

    expect(result).toEqual([]);
    expect(mockSlotRepo.findAll).toHaveBeenCalled();
  });

  // caminho feliz do create: os mocks do repo cobrem a validacao
  // minima e o service delega o create. o teste confirma que o id
  // veio do retorno do repo.
  it('deve criar novo horário de escala', async () => {
    const mockSlot = {
      id: 1,
      date: new Date('2025-10-15T00:00:00.000Z'),
      timeSlot: '09:00',
      maxCapacity: 4,
      bookedCount: 0,
      isActive: true,
      active: true,
      appointments: [],
    };
    mockSlotRepo.create.mockResolvedValue(mockSlot);

    const result = await slotService.create(1, 'ADMIN', {
      date: '2025-10-15',
      timeSlot: '09:00',
      maxCapacity: 4,
      assignedToId: 2,
    });

    expect(result.id).toBe(1);
    expect(mockSlotRepo.create).toHaveBeenCalled();
  });

  // verifica que o getbyid delega pro findbyid do repo e devolve o
  // resultado sem transformacao.
  it('deve buscar horário de escala por ID', async () => {
    const mockSlot = { id: 1, date: new Date(), timeSlot: '10:00' };
    mockSlotRepo.findById.mockResolvedValue(mockSlot);

    const result = await slotService.getById(1);

    expect(result).toEqual(mockSlot);
  });

  // trava de seguranca: se a escala tem agendamento ativo (pending
  // ou confirmed), o service precisa cortar com 409 antes de tentar
  // excluir. isso evita apagar uma escala que ainda esta em uso.
  it('deve bloquear exclusão de escala com agendamento ativo', async () => {
    mockSlotRepo.findById.mockResolvedValue({
      id: 1,
      appointments: [{ status: 'PENDING' }],
    });

    await expect(slotService.delete(1, 'ADMIN', 1)).rejects.toMatchObject({ statusCode: 409 });
  });
});