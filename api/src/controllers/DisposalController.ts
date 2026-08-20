import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { DisposalService } from '../services/DisposalService';

export class DisposalController {
  private disposalService: DisposalService;

  constructor() {
    this.disposalService = new DisposalService();
  }

  getAll = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const disposals = await this.disposalService.getAll();
      res.json(disposals);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao buscar descartes' });
    }
  };

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const disposal = await this.disposalService.create(userId, role, req.body);
      res.status(201).json(disposal);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao registrar descarte' });
    }
  };

  revert = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const id = Number(req.params.id);
      const reverted = await this.disposalService.revert(userId, role, id);
      res.json(reverted);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao reverter descarte' });
    }
  };
}
