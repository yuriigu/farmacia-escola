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

  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const disposal = await this.disposalService.getById(id);
      res.json(disposal);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao buscar descarte' });
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

  update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const id = Number(req.params.id);
      const updated = await this.disposalService.update(userId, role, id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao atualizar descarte' });
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const id = Number(req.params.id);
      const result = await this.disposalService.delete(userId, role, id);
      res.json(result);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao excluir descarte' });
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
