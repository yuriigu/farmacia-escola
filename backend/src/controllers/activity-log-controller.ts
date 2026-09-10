import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth-middleware';
import { ActivityLogService } from '../services/activity-log-service';
import { prisma } from '../utils/prisma';

export class ActivityLogController {
  private logService: ActivityLogService;

  constructor() {
    this.logService = new ActivityLogService();
  }

  getAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const role = req.user.role;

      let isAllowed = false;
      if (role === 'ADMIN') {
        isAllowed = true;
      } else {
        if (role === 'FARMACEUTICO') {
          isAllowed = true;
        } else {
          isAllowed = false;
        }
      }

      if (!isAllowed) {
        res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem acessar logs de auditoria' });
        return;
      }

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
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const role = req.user.role;

      let isAllowed = false;
      if (role === 'ADMIN') {
        isAllowed = true;
      } else {
        if (role === 'FARMACEUTICO') {
          isAllowed = true;
        } else {
          isAllowed = false;
        }
      }

      if (!isAllowed) {
        res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem acessar logs de auditoria' });
        return;
      }

      const id = Number(req.params.id);
      if (!id) {
        res.status(400).json({ error: 'ID de log inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de log inválido' });
          return;
        }
      }

      const logRecord = await prisma.activityLog.findUnique({
        where: { id: id },
      });

      if (!logRecord) {
        res.status(404).json({ error: 'Log de atividade não encontrado' });
        return;
      }

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