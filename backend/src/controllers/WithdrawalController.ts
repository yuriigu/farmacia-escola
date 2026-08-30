import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { WithdrawalService } from '../services/WithdrawalService';

export class WithdrawalController {
  private withdrawalService: WithdrawalService;

  constructor() {
    this.withdrawalService = new WithdrawalService();
  }

  getAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { role, patientId } = req.user!;
      const withdrawals = await this.withdrawalService.getAll(role, patientId);
      res.json(withdrawals);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao buscar dispensações' });
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { role, patientId } = req.user!;
      const id = Number(req.params.id);
      const withdrawal = await this.withdrawalService.getById(id, role, patientId);
      res.json(withdrawal);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao buscar dispensação' });
    }
  };

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const withdrawal = await this.withdrawalService.create(userId, role, req.body);
      res.status(201).json(withdrawal);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao registrar dispensação' });
    }
  };

  update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const id = Number(req.params.id);
      const updated = await this.withdrawalService.update(userId, role, id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao atualizar dispensação' });
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const id = Number(req.params.id);
      const result = await this.withdrawalService.delete(userId, role, id);
      res.json(result);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao estornar dispensação' });
    }
  };
}