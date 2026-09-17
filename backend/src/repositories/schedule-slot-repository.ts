import { prisma } from '../utils/prisma';

export class ScheduleSlotRepository {
  async findAll(filters?: { startDate?: Date; endDate?: Date }) {
    const where: Record<string, unknown> = { active: true };
    if (filters?.startDate && filters?.endDate) {
      where.date = { gte: filters.startDate, lte: filters.endDate };
    } else if (filters?.startDate) {
      where.date = { gte: filters.startDate };
    }

    // OTIMIZADO: _count agregado no banco (usa índice [slotId, status]) em vez
    // de trazer todos os appointments para contar em JS (slot.appointments.length).
    const slots = await prisma.scheduleSlot.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
        _count: {
          select: {
            appointments: { where: { status: { in: ['PENDING', 'CONFIRMED'] } } },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
    });

    return slots;
  }

  async findById(id: number) {
    return prisma.scheduleSlot.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
        appointments: true,
      },
    });
  }

  async create(data: {
    date: Date;
    timeSlot: string;
    maxCapacity?: number;
    assignedToId?: number | null;
  }) {
    return prisma.scheduleSlot.create({
      data: {
        date: data.date,
        timeSlot: data.timeSlot,
        maxCapacity: data.maxCapacity ?? 5,
        assignedToId: data.assignedToId ?? null,
      },
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
      },
    });
  }

  async update(
    id: number,
    data: {
      date?: Date;
      timeSlot?: string;
      maxCapacity?: number;
      assignedToId?: number | null;
      active?: boolean;
    }
  ) {
    return prisma.scheduleSlot.update({
      where: { id },
      data,
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
      },
    });
  }

  async delete(id: number) {
    return prisma.scheduleSlot.update({
      where: { id },
      data: { active: false },
    });
  }
}