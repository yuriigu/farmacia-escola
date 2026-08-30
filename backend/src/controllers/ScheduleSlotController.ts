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
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const slots = await this.slotService.getAll(startDate, endDate);
      res.json(slots);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao buscar escalas' });
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const slot = await this.slotService.getById(id);
      res.json(slot);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao buscar escala' });
    }
  };

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const slot = await this.slotService.create(userId, role, req.body);
      res.status(201).json(slot);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao criar escala' });
    }
  };

  update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const id = Number(req.params.id);
      const updated = await this.slotService.update(userId, role, id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao atualizar escala' });
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const id = Number(req.params.id);
      const result = await this.slotService.delete(userId, role, id);
      res.json(result);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao remover escala' });
    }
  };
}