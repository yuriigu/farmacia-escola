import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/AuthMiddleware';
import { BatchService } from '../services/BatchService';

export class BatchController {
  private batchService: BatchService;

  constructor() {
    this.batchService = new BatchService();
  }

  getAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      let medicineId = undefined;
      if (req.query.medicineId) {
        medicineId = Number(req.query.medicineId);
      } else {
        medicineId = undefined;
      }
      const batches = await this.batchService.getAll(medicineId);
      res.json(batches);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar lotes' });
        return;
      }
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const batch = await this.batchService.getById(id);
      res.json(batch);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar lote' });
        return;
      }
    }
  };

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const batch = await this.batchService.create(userId, role, req.body);
      res.status(201).json(batch);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao cadastrar lote' });
        return;
      }
    }
  };

  update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const id = Number(req.params.id);
      const updated = await this.batchService.update(userId, role, id, req.body);
      res.json(updated);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao atualizar lote' });
        return;
      }
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const id = Number(req.params.id);
      const result = await this.batchService.delete(userId, role, id);
      res.json(result);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao excluir lote' });
        return;
      }
    }
  };
}