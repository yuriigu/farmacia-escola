import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
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
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao buscar agendamentos' });
    }
  };

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const appointment = await this.appointmentService.create(req.user!, req.body);
      res.status(201).json(appointment);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao criar agendamento' });
    }
  };

  updateStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const id = Number(req.params.id);
      const { status, notes } = req.body;
      const updated = await this.appointmentService.updateStatus(userId, role, id, status, notes);
      res.json(updated);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao atualizar status do agendamento' });
    }
  };
}
