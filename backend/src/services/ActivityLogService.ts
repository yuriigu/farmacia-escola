import { ActivityLogRepository } from '../repositories/ActivityLogRepository';

export class ActivityLogService {
  private logRepo: ActivityLogRepository;

  constructor() {
    this.logRepo = new ActivityLogRepository();
  }

  async log(userId: number, action: string, entity: string, entityId?: number | null, details?: string | null) {
    try {
      return await this.logRepo.create({
        userId,
        action,
        entity,
        entityId,
        details,
      });
    } catch (err) {
      console.error('Failed to write activity log:', err);
    }
  }

  async getLogs(filters: { userId?: number; entity?: string; page?: number; limit?: number }) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 50));
    const skip = (page - 1) * limit;

    const { logs, total } = await this.logRepo.findMany({
      userId: filters.userId,
      entity: filters.entity,
      skip,
      take: limit,
    });

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: number) {
    const log = await this.logRepo.findById(id);
    if (!log) throw { statusCode: 404, message: 'Log de atividade não encontrado' };
    return log;
  }
}
