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

  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const batch = await this.batchService.getById(id);
      res.json(batch);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao buscar lote' });
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

  update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const id = Number(req.params.id);
      const updated = await this.batchService.update(userId, role, id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao atualizar lote' });
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const id = Number(req.params.id);
      const result = await this.batchService.delete(userId, role, id);
      res.json(result);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao excluir lote' });
    }
  };
}
