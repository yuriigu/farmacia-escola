import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/AuthMiddleware';
import { ActivityLogService } from '../services/ActivityLogService';

export class ActivityLogController {
  private logService: ActivityLogService;

  constructor() {
    this.logService = new ActivityLogService();
  }

  getAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      let userId = undefined;
      if (req.query.userId) {
        userId = Number(req.query.userId);
      } else {
        userId = undefined;
      }

      let entity = undefined;
      if (req.query.entity) {
        entity = req.query.entity as string;
      } else {
        entity = undefined;
      }

      let page = 1;
      if (req.query.page) {
        page = Number(req.query.page);
      } else {
        page = 1;
      }

      let limit = 50;
      if (req.query.limit) {
        limit = Number(req.query.limit);
      } else {
        limit = 50;
      }

      const result = await this.logService.getLogs({
        userId,
        entity,
        page,
        limit,
      });

      res.json(result);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar logs de auditoria' });
        return;
      }
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const log = await this.logService.getById(id);
      res.json(log);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar log de atividade' });
        return;
      }
    }
  };
}