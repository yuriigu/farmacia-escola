import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middlewares/auth.middleware';
import { Role, AppointmentStatus } from '@prisma/client';

const appointmentRoutes = Router();

// Todas as rotas de agendamento exigem autenticação
appointmentRoutes.use(authMiddleware);

// GET /appointments - Lista agendamentos
appointmentRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const authUser = (req as Request & { user: { id: number, role: Role } }).user;
    const userRole = authUser.role;
    const userId = authUser.id;
    const { status } = req.query;

    let whereClause: any = {};
    
    // Filtro por status opcional
    if (status) {
      whereClause.status = status as AppointmentStatus;
    }

    // Regra: Paciente só vê os próprios agendamentos
    if (userRole === Role.PACIENTE) {
      const patient = await prisma.patient.findUnique({
        where: { userId: userId }
      });
      
      if (!patient) {
        return res.status(404).json({ error: 'Paciente não encontrado.' });
      }
      
      whereClause.patientId = patient.id;
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        medicine: {
          select: {
            id: true,
            name: true,
            dosage: true,
            activeIngredient: true
          }
        },
        patient: {
          select: {
            id: true,
            name: true,
            cpf: true,
            phone: true
          }
        }
      },
      orderBy: { scheduledDate: 'asc' }
    });

    return res.json(appointments);
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    return res.status(500).json({ error: 'Erro ao buscar agendamentos.' });
  }
});

// GET /appointments/:id - Busca um agendamento específico
appointmentRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const authUser = (req as Request & { user: { id: number, role: Role } }).user;

    const appointment = await prisma.appointment.findUnique({
      where: { id: parseInt(String(id), 10) },
      include: {
        medicine: true,
        patient: true
      }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    // Verifica se o paciente tem permissão para ver este agendamento
    if (authUser.role === Role.PACIENTE) {
      const patient = await prisma.patient.findUnique({
        where: { userId: authUser.id }
      });
      
      if (!patient || appointment.patientId !== patient.id) {
        return res.status(403).json({ error: 'Acesso negado.' });
      }
    }

    return res.json(appointment);
  } catch (error) {
    console.error('Erro ao buscar agendamento:', error);
    return res.status(500).json({ error: 'Erro ao buscar agendamento.' });
  }
});

// POST /appointments - Cria um novo agendamento
appointmentRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const { medicineId, scheduledDate, notes, patientId } = req.body;
    const authUser = (req as Request & { user: { id: number, role: Role } }).user;
    const userRole = authUser.role;
    const userId = authUser.id;

    // Valida campos obrigatórios
    if (!medicineId || !scheduledDate) {
      return res.status(400).json({ 
        error: 'Medicamento e data/hora são obrigatórios.' 
      });
    }

    let finalPatientId = patientId;

    // Se for paciente, usa o próprio patientId
    if (userRole === Role.PACIENTE) {
      const patient = await prisma.patient.findUnique({
        where: { userId: userId }
      });
      
      if (!patient) {
        return res.status(404).json({ error: 'Paciente não encontrado.' });
      }
      
      finalPatientId = patient.id;
    } else {
      // Se for admin/farmaceutico, o patientId deve ser fornecido
      if (!patientId) {
        return res.status(400).json({ 
          error: 'ID do paciente é obrigatório para funcionários.' 
        });
      }

      // Verifica se o paciente existe
      const patientExists = await prisma.patient.findUnique({
        where: { id: parseInt(patientId) }
      });
      
      if (!patientExists) {
        return res.status(404).json({ error: 'Paciente não encontrado.' });
      }
    }

    // Verifica se o medicamento existe
    const medicineExists = await prisma.medicine.findUnique({
      where: { id: parseInt(medicineId) }
    });
    
    if (!medicineExists) {
      return res.status(404).json({ error: 'Medicamento não encontrado.' });
    }

    // Regra de conflito: Verifica se já existe agendamento no mesmo horário
    const dateObj = new Date(scheduledDate);
    const conflict = await prisma.appointment.findFirst({
      where: {
        scheduledDate: dateObj,
        status: {
          not: AppointmentStatus.CANCELLED
        }
      }
    });

    if (conflict) {
      return res.status(400).json({ 
        error: 'Horário indisponível. Já existe um agendamento neste horário.' 
      });
    }

    // Cria o agendamento
    const appointment = await prisma.appointment.create({
      data: {
        patientId: parseInt(finalPatientId as any),
        medicineId: parseInt(medicineId),
        scheduledDate: dateObj,
        notes: notes || null,
        status: AppointmentStatus.PENDING
      },
      include: {
        medicine: true,
        patient: true
      }
    });

    return res.status(201).json({
      ...appointment,
      message: 'Agendamento criado com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    return res.status(500).json({ error: 'Erro ao criar agendamento.' });
  }
});

// PUT /appointments/:id - Atualiza um agendamento
appointmentRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, scheduledDate, notes, medicineId } = req.body;
    const authUser = (req as Request & { user: { id: number, role: Role } }).user;

    // Verifica se o agendamento existe
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id: parseInt(String(id), 10) }
    });

    if (!existingAppointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    // Paciente só pode cancelar o próprio agendamento
    if (authUser.role === Role.PACIENTE) {
      const patient = await prisma.patient.findUnique({
        where: { userId: authUser.id }
      });
      
      if (!patient || existingAppointment.patientId !== patient.id) {
        return res.status(403).json({ error: 'Acesso negado.' });
      }

      // Paciente só pode cancelar agendamentos
      if (status && status !== AppointmentStatus.CANCELLED) {
        return res.status(403).json({ 
          error: 'Pacientes só podem cancelar agendamentos.' 
        });
      }
    }

    // Prepara dados para atualização
    const data: any = {};
    
    if (status) data.status = status;
    if (scheduledDate) data.scheduledDate = new Date(scheduledDate);
    if (notes !== undefined) data.notes = notes;
    if (medicineId) {
      const medicineExists = await prisma.medicine.findUnique({
        where: { id: parseInt(medicineId) }
      });
      if (!medicineExists) {
        return res.status(404).json({ error: 'Medicamento não encontrado.' });
      }
      data.medicineId = parseInt(medicineId);
    }

    // Atualiza o agendamento
    const updatedAppointment = await prisma.appointment.update({
      where: { id: parseInt(String(id), 10) },
      data,
      include: {
        medicine: true,
        patient: true
      }
    });

    return res.json({
      ...updatedAppointment,
      message: 'Agendamento atualizado com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error);
    return res.status(500).json({ error: 'Erro ao atualizar agendamento.' });
  }
});

// DELETE /appointments/:id - Cancela um agendamento (Soft delete)
appointmentRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const authUser = (req as Request & { user: { id: number, role: Role } }).user;

    // Verifica se o agendamento existe
    const appointment = await prisma.appointment.findUnique({
      where: { id: parseInt(String(id), 10) },
      include: { patient: true }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    // Paciente só cancela o próprio agendamento
    if (authUser.role === Role.PACIENTE) {
      const patient = await prisma.patient.findUnique({
        where: { userId: authUser.id }
      });
      
      if (!patient || appointment.patientId !== patient.id) {
        return res.status(403).json({ error: 'Acesso negado.' });
      }
    }

    // Se já estiver cancelado, retorna erro
    if (appointment.status === AppointmentStatus.CANCELLED) {
      return res.status(400).json({ error: 'Agendamento já está cancelado.' });
    }

    // Se já estiver concluído, não pode cancelar
    if (appointment.status === AppointmentStatus.COMPLETED) {
      return res.status(400).json({ 
        error: 'Agendamento concluído não pode ser cancelado.' 
      });
    }

    // Cancela o agendamento
    const cancelledAppointment = await prisma.appointment.update({
      where: { id: parseInt(String(id), 10) },
      data: { status: AppointmentStatus.CANCELLED }
    });

    return res.json({
      ...cancelledAppointment,
      message: 'Agendamento cancelado com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao cancelar agendamento:', error);
    return res.status(500).json({ error: 'Erro ao cancelar agendamento.' });
  }
});

export { appointmentRoutes };