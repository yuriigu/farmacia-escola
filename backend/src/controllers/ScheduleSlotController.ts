import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
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

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const slot = await this.slotService.create(userId, role, req.body);
      res.status(201).json(slot);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao criar escala' });
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
