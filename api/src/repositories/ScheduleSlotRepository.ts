import { prisma } from '../utils/prisma';

export class ScheduleSlotRepository {
  async findAll(filters?: { startDate?: Date; endDate?: Date }) {
    const where: Record<string, unknown> = { active: true };
    if (filters?.startDate && filters?.endDate) {
      where.date = { gte: filters.startDate, lte: filters.endDate };
    } else if (filters?.startDate) {
      where.date = { gte: filters.startDate };
    }

    const slots = await prisma.scheduleSlot.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
        appointments: { where: { status: 'PENDING' } },
      },
      orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
    });

    return slots.map((slot) => ({
      ...slot,
      _count: { appointments: slot.appointments.length },
    }));
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
