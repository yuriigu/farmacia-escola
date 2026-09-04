import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/AuthMiddleware';
import { AppointmentService } from '../services/AppointmentService';

export class AppointmentController {
  private appointmentService: AppointmentService;

  constructor() {
    this.appointmentService = new AppointmentService();
  }

  getAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { role, userId, patientId } = req.user!;
      const appointments = await this.appointmentService.getAll(role, userId, patientId);
      res.json(appointments);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar agendamentos' });
        return;
      }
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const appointment = await this.appointmentService.getById(id, req.user!);
      res.json(appointment);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar agendamento' });
        return;
      }
    }
  };

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const appointment = await this.appointmentService.create(req.user!, req.body);
      res.status(201).json(appointment);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao criar agendamento' });
        return;
      }
    }
  };

  update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const id = Number(req.params.id);
      const updated = await this.appointmentService.update(userId, role, id, req.body);
      res.json(updated);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao atualizar agendamento' });
        return;
      }
    }
  };

  updateStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const id = Number(req.params.id);
      const { status, notes } = req.body;
      const updated = await this.appointmentService.updateStatus(userId, role, id, status, notes);
      res.json(updated);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao atualizar status do agendamento' });
        return;
      }
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const id = Number(req.params.id);
      const result = await this.appointmentService.delete(userId, role, id);
      res.json(result);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao cancelar/excluir agendamento' });
        return;
      }
    }
  };
}