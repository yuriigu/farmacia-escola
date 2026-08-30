import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScheduleSlotService } from '../../../src/services/ScheduleSlotService';
import { ScheduleSlotRepository } from '../../../src/repositories/ScheduleSlotRepository';

vi.mock('../../../src/repositories/ScheduleSlotRepository');
vi.mock('../../../src/services/ActivityLogService');

describe('ScheduleSlotService', () => {
  let slotService: ScheduleSlotService;
  let mockSlotRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSlotRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByDateAndTime: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    (ScheduleSlotRepository as any).mockImplementation(function () {
      return mockSlotRepo;
    });

    slotService = new ScheduleSlotService();
  });

  it('deve listar horários disponíveis no período informado', async () => {
    mockSlotRepo.findAll.mockResolvedValue([]);

    const result = await slotService.getAll('2025-10-01', '2025-10-31');

    expect(result).toEqual([]);
    expect(mockSlotRepo.findAll).toHaveBeenCalled();
  });

  it('deve criar novo horário de escala', async () => {
    const mockSlot = {
      id: 1,
      date: new Date('2025-10-15T00:00:00.000Z'),
      timeSlot: '09:00',
      maxCapacity: 4,
      bookedCount: 0,
      isActive: true,
    };
    mockSlotRepo.create.mockResolvedValue(mockSlot);

    const result = await slotService.create(1, 'ADMIN', {
      date: '2025-10-15',
      timeSlot: '09:00',
      maxCapacity: 4,
    });

    expect(result.id).toBe(1);
    expect(mockSlotRepo.create).toHaveBeenCalled();
  });

  it('deve buscar horário de escala por ID', async () => {
    const mockSlot = { id: 1, date: new Date(), timeSlot: '10:00' };
    mockSlotRepo.findById.mockResolvedValue(mockSlot);

    const result = await slotService.getById(1);

    expect(result).toEqual(mockSlot);
  });
});