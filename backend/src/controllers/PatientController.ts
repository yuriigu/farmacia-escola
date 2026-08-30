import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { PatientService } from '../services/PatientService';

export class PatientController {
  private patientService: PatientService;

  constructor() {
    this.patientService = new PatientService();
  }

  getAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { role, userId } = req.user!;
      const search = req.query.search as string | undefined;
      const patients = await this.patientService.getAll(role, userId, search);
      res.json(patients);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao buscar pacientes' });
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { role, userId } = req.user!;
      const id = Number(req.params.id);
      const patient = await this.patientService.getById(id, role, userId);
      res.json(patient);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao buscar dados do paciente' });
    }
  };

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const patient = await this.patientService.create(userId, role, req.body);
      res.status(201).json(patient);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao cadastrar paciente' });
    }
  };

  update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const id = Number(req.params.id);
      const updated = await this.patientService.update(userId, role, id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao atualizar paciente' });
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const id = Number(req.params.id);
      const result = await this.patientService.delete(userId, role, id);
      res.json(result);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao excluir paciente' });
    }
  };
}