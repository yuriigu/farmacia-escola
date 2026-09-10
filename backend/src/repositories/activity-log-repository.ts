import { prisma } from '../utils/prisma';

export interface CreateActivityLogDTO {
  userId: number;
  action: string;
  entity: string;
  entityId?: number | null;
  details?: string | null;
}

export class ActivityLogRepository {
  async create(data: CreateActivityLogDTO) {
    return prisma.activityLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId ?? null,
        details: data.details ?? null,
      },
    });
  }

  async findMany(filters: { userId?: number; entity?: string; skip?: number; take?: number }) {
    const where: Record<string, unknown> = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.entity) where.entity = filters.entity;

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: filters.skip ?? 0,
        take: filters.take ?? 50,
      }),
      prisma.activityLog.count({ where }),
    ]);

    return { logs, total };
  }

  async findById(id: number) {
    return prisma.activityLog.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    });
  }
}