import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/AuthMiddleware';
import { PatientService } from '../services/PatientService';

export class PatientController {
  private patientService: PatientService;

  constructor() {
    this.patientService = new PatientService();
  }

  getAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { role, userId } = req.user!;
      let search = undefined;
      if (req.query.search) {
        search = req.query.search as string;
      } else {
        search = undefined;
      }
      const patients = await this.patientService.getAll(role, userId, search);
      res.json(patients);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar pacientes' });
        return;
      }
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { role, userId } = req.user!;
      const id = Number(req.params.id);
      const patient = await this.patientService.getById(id, role, userId);
      res.json(patient);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar dados do paciente' });
        return;
      }
    }
  };

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const patient = await this.patientService.create(userId, role, req.body);
      res.status(201).json(patient);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao cadastrar paciente' });
        return;
      }
    }
  };

  update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const id = Number(req.params.id);
      const updated = await this.patientService.update(userId, role, id, req.body);
      res.json(updated);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao atualizar paciente' });
        return;
      }
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const id = Number(req.params.id);
      const result = await this.patientService.delete(userId, role, id);
      res.json(result);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao excluir paciente' });
        return;
      }
    }
  };
}