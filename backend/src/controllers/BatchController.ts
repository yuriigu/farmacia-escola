import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { BatchService } from '../services/BatchService';

export class BatchController {
  private batchService: BatchService;

  constructor() {
    this.batchService = new BatchService();
  }

  getAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const medicineId = req.query.medicineId ? Number(req.query.medicineId) : undefined;
      const batches = await this.batchService.getAll(medicineId);
      res.json(batches);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao buscar lotes' });
    }
  };

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const batch = await this.batchService.create(userId, role, req.body);
      res.status(201).json(batch);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao cadastrar lote' });
    }
  };
}
