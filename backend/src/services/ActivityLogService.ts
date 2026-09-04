import { ActivityLogRepository } from '../repositories/ActivityLogRepository';

export class ActivityLogService {
  private logRepo: ActivityLogRepository;

  constructor() {
    this.logRepo = new ActivityLogRepository();
  }

  async log(userId: number, action: string, entity: string, entityId?: number | null, details?: string | null) {
    if (!userId) {
      return null;
    } else {
      if (!action) {
        return null;
      } else {
        if (!entity) {
          return null;
        }
      }
    }

    let resolvedEntityId = null;
    if (entityId !== undefined && entityId !== null) {
      resolvedEntityId = entityId;
    } else {
      resolvedEntityId = null;
    }

    let resolvedDetails = null;
    if (details) {
      resolvedDetails = details.trim();
    } else {
      resolvedDetails = null;
    }

    try {
      return await this.logRepo.create({
        userId,
        action: action.trim(),
        entity: entity.trim(),
        entityId: resolvedEntityId,
        details: resolvedDetails,
      });
    } catch (err) {
      console.error('Failed to write activity log:', err);
      return null;
    }
  }

  async getLogs(filters: { userId?: number; entity?: string; page?: number; limit?: number }) {
    let pageNumber = 1;
    if (filters.page) {
      pageNumber = Number(filters.page);
    } else {
      pageNumber = 1;
    }
    const page = Math.max(1, pageNumber);

    let limitNumber = 50;
    if (filters.limit) {
      limitNumber = Number(filters.limit);
    } else {
      limitNumber = 50;
    }
    const limit = Math.min(100, Math.max(1, limitNumber));
    const skip = (page - 1) * limit;

    let parsedUserId = undefined;
    if (filters.userId) {
      parsedUserId = Number(filters.userId);
    } else {
      parsedUserId = undefined;
    }

    let cleanEntity = undefined;
    if (filters.entity) {
      cleanEntity = filters.entity.trim();
    } else {
      cleanEntity = undefined;
    }

    let filterUserId = undefined;
    if (parsedUserId) {
      if (!isNaN(parsedUserId)) {
        filterUserId = parsedUserId;
      } else {
        filterUserId = undefined;
      }
    } else {
      filterUserId = undefined;
    }

    const { logs, total } = await this.logRepo.findMany({
      userId: filterUserId,
      entity: cleanEntity,
      skip,
      take: limit,
    });

    let calculatedTotalPages = Math.ceil(total / limit);
    let totalPages = 1;
    if (calculatedTotalPages) {
      totalPages = calculatedTotalPages;
    } else {
      totalPages = 1;
    }

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getById(id: number) {
    const numericId = Number(id);
    if (!numericId) {
      throw { statusCode: 400, message: 'ID de log inválido' };
    } else {
      if (isNaN(numericId)) {
        throw { statusCode: 400, message: 'ID de log inválido' };
      }
    }

    const log = await this.logRepo.findById(numericId);
    if (!log) {
      throw { statusCode: 404, message: 'Log de atividade não encontrado' };
    }
    return log;
  }
}
