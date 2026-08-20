import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { MedicineService } from '../services/MedicineService';

export class MedicineController {
  private medicineService: MedicineService;

  constructor() {
    this.medicineService = new MedicineService();
  }

  getAll = async (req: AuthRequest, res: Response) => {
    try {
      const medicines = await this.medicineService.listMedicines();
      return res.json(medicines);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Erro ao buscar medicamentos' });
    }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const medicine = await this.medicineService.createMedicine(userId, req.body);
      return res.status(201).json(medicine);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Erro ao cadastrar medicamento' });
    }
  };
}