import { ActivityLogRepository } from '../repositories/ActivityLogRepository';

export class ActivityLogService {
  private logRepo: ActivityLogRepository;

  constructor() {
    this.logRepo = new ActivityLogRepository();
  }

  async log(userId: number, action: string, entity: string, entityId?: number | null, details?: string | null) {
    if (!userId || !action || !entity) {
      return null;
    }

    try {
      return await this.logRepo.create({
        userId,
        action: action.trim(),
        entity: entity.trim(),
        entityId: entityId ?? null,
        details: details ? details.trim() : null,
      });
    } catch (err) {
      console.error('Failed to write activity log:', err);
      return null;
    }
  }

  async getLogs(filters: { userId?: number; entity?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 50));
    const skip = (page - 1) * limit;

    const parsedUserId = filters.userId ? Number(filters.userId) : undefined;
    const cleanEntity = filters.entity?.trim() || undefined;

    const { logs, total } = await this.logRepo.findMany({
      userId: parsedUserId && !isNaN(parsedUserId) ? parsedUserId : undefined,
      entity: cleanEntity,
      skip,
      take: limit,
    });

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getById(id: number) {
    const numericId = Number(id);
    if (!numericId || isNaN(numericId)) {
      throw { statusCode: 400, message: 'ID de log inválido' };
    }

    const log = await this.logRepo.findById(numericId);
    if (!log) throw { statusCode: 404, message: 'Log de atividade não encontrado' };
    return log;
  }
}