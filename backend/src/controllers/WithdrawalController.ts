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

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const withdrawal = await this.withdrawalService.create(userId, role, req.body);
      res.status(201).json(withdrawal);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao registrar dispensação' });
    }
  };
}
