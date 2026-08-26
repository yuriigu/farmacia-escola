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

  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const appointment = await this.appointmentService.getById(id, req.user!);
      res.json(appointment);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao buscar agendamento' });
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

  update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const id = Number(req.params.id);
      const updated = await this.appointmentService.update(userId, role, id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao atualizar agendamento' });
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

  delete = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.user!;
      const id = Number(req.params.id);
      const result = await this.appointmentService.delete(userId, role, id);
      res.json(result);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao cancelar/excluir agendamento' });
    }
  };
}
