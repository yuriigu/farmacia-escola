import { ScheduleSlotRepository } from '../repositories/ScheduleSlotRepository';
import { ActivityLogService } from './ActivityLogService';

export class ScheduleSlotService {
  private slotRepo: ScheduleSlotRepository;
  private logService: ActivityLogService;

  constructor() {
    this.slotRepo = new ScheduleSlotRepository();
    this.logService = new ActivityLogService();
  }

  async getAll(startDate?: string, endDate?: string) {
    return this.slotRepo.findAll({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  async create(userId: number, role: string, data: {
    date: string | Date;
    timeSlot: string;
    maxCapacity?: number;
    assignedToId?: number;
  }) {
    const { date, timeSlot, maxCapacity, assignedToId } = data;

    if (!date || !timeSlot) {
      throw { statusCode: 400, message: 'Data e horário do slot são obrigatórios' };
    }

    try {
      const slot = await this.slotRepo.create({
        date: new Date(date),
        timeSlot,
        maxCapacity: maxCapacity || 5,
        assignedToId: assignedToId || null,
      });

      if (role === 'FARMACEUTICO' || role === 'ADMIN') {
        await this.logService.log(
          userId,
          'create',
          'scheduleSlots',
          slot.id,
          `Criou escala de atendimento para ${new Date(slot.date).toLocaleDateString('pt-BR')} às ${slot.timeSlot}`
        );
      }

      return slot;
    } catch (err: any) {
      if (err.message?.includes('Unique constraint')) {
        throw { statusCode: 409, message: 'Já existe um horário cadastrado nessa mesma data e hora' };
      }
      throw err;
    }
  }

  async delete(userId: number, role: string, id: number) {
    const slot = await this.slotRepo.findById(id);
    if (!slot) throw { statusCode: 404, message: 'Horário de escala não encontrado' };

    await this.slotRepo.delete(id);

    if (role === 'FARMACEUTICO' || role === 'ADMIN') {
      await this.logService.log(
        userId,
        'delete',
        'scheduleSlots',
        id,
        `Removeu/desativou escala #${id}`
      );
    }

    return { success: true };
  }
}
