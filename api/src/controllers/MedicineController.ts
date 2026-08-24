import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { MedicineService } from '../services/MedicineService';

export class MedicineController {
  private medicineService: MedicineService;

  constructor() {
    this.medicineService = new MedicineService();
  }

  getAll = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const medicines = await this.medicineService.getAll();
      res.json(medicines);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao buscar medicamentos' });
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const medicine = await this.medicineService.getById(id);
      res.json(medicine);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao buscar medicamento' });
    }
  };

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const medicine = await this.medicineService.create(userId, role, req.body);
      res.status(201).json(medicine);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao cadastrar medicamento' });
    }
  };

  update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const id = Number(req.params.id);
      const updated = await this.medicineService.update(userId, role, id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao atualizar medicamento' });
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const id = Number(req.params.id);
      await this.medicineService.delete(userId, role, id);
      res.json({ message: 'Medicamento excluído com sucesso' });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao excluir medicamento' });
    }
  };
}
