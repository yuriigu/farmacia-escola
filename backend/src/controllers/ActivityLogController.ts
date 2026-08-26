import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { ActivityLogService } from '../services/ActivityLogService';

export class ActivityLogController {
  private logService: ActivityLogService;

  constructor() {
    this.logService = new ActivityLogService();
  }

  getAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.query.userId ? Number(req.query.userId) : undefined;
      const entity = req.query.entity as string | undefined;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 50;

      const result = await this.logService.getLogs({
        userId,
        entity,
        page,
        limit,
      });

      res.json(result);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao buscar logs de auditoria' });
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const log = await this.logService.getById(id);
      res.json(log);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao buscar log de atividade' });
    }
  };
}
