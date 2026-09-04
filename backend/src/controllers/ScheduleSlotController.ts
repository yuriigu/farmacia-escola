import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/AuthMiddleware';
import { ScheduleSlotService } from '../services/ScheduleSlotService';

export class ScheduleSlotController {
  private slotService: ScheduleSlotService;

  constructor() {
    this.slotService = new ScheduleSlotService();
  }

  getAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      let startDate = undefined;
      if (req.query.startDate) {
        startDate = req.query.startDate as string;
      } else {
        startDate = undefined;
      }

      let endDate = undefined;
      if (req.query.endDate) {
        endDate = req.query.endDate as string;
      } else {
        endDate = undefined;
      }

      const slots = await this.slotService.getAll(startDate, endDate);
      res.json(slots);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar escalas' });
        return;
      }
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const slot = await this.slotService.getById(id);
      res.json(slot);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar escala' });
        return;
      }
    }
  };

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const slot = await this.slotService.create(userId, role, req.body);
      res.status(201).json(slot);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao criar escala' });
        return;
      }
    }
  };

  update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const id = Number(req.params.id);
      const updated = await this.slotService.update(userId, role, id, req.body);
      res.json(updated);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao atualizar escala' });
        return;
      }
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const id = Number(req.params.id);
      const result = await this.slotService.delete(userId, role, id);
      res.json(result);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao remover escala' });
        return;
      }
    }
  };
}