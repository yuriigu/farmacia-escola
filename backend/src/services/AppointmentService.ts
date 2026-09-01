import { AppointmentRepository } from '../repositories/AppointmentRepository';
import { ScheduleSlotRepository } from '../repositories/ScheduleSlotRepository';
import { MedicineRepository } from '../repositories/MedicineRepository';
import { PatientRepository } from '../repositories/PatientRepository';
import { ActivityLogService } from './ActivityLogService';
import { prisma } from '../utils/Prisma';

export class AppointmentService {
  private appointmentRepo: AppointmentRepository;
  private slotRepo: ScheduleSlotRepository;
  private medicineRepo: MedicineRepository;
  private patientRepo: PatientRepository;
  private logService: ActivityLogService;

  constructor() {
    this.appointmentRepo = new AppointmentRepository();
    this.slotRepo = new ScheduleSlotRepository();
    this.medicineRepo = new MedicineRepository();
    this.patientRepo = new PatientRepository();
    this.logService = new ActivityLogService();
  }

  async getAll(role: string, userId: number, patientId?: number | null) {
    if (role === 'PACIENTE') {
      const patient = await this.patientRepo.findByUserId(userId);
      if (!patient) return [];
      return this.appointmentRepo.findAll(patient.id);
    }
    return this.appointmentRepo.findAll(patientId ?? undefined);
  }

  async getById(id: number, user: { userId: number; role: string }) {
    const numericId = Number(id);
    if (!numericId || isNaN(numericId)) {
      throw { statusCode: 400, message: 'ID de agendamento inválido' };
    }

    const appt = await this.appointmentRepo.findById(numericId);
    if (!appt) throw { statusCode: 404, message: 'Agendamento não encontrado' };

    if (user.role === 'PACIENTE') {
      const patient = await this.patientRepo.findByUserId(user.userId);
      if (!patient || appt.patientId !== patient.id) {
        throw { statusCode: 403, message: 'Acesso não autorizado ao agendamento' };
      }
    }

    return appt;
  }

  async create(user: { userId: number; role: string; patientId?: number | null }, data: {
    scheduledDate: string | Date;
    scheduledTime?: string;
    slotId?: number;
    patientId?: number;
    patientName?: string;
    patientCpf?: string;
    notes?: string;
    items: Array<{ medicineId: number; quantity: number }>;
  }) {
    const { scheduledDate, scheduledTime, slotId, patientId, patientName, patientCpf, notes, items } = data;

    if (!scheduledDate) {
      throw { statusCode: 400, message: 'Data do agendamento é obrigatória' };
    }

    const parsedDate = new Date(scheduledDate);
    if (isNaN(parsedDate.getTime())) {
      throw { statusCode: 400, message: 'Data de agendamento inválida' };
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw { statusCode: 400, message: 'Ao menos um medicamento deve ser adicionado ao agendamento' };
    }

    const numericSlotId = slotId ? Number(slotId) : undefined;
    if (numericSlotId) {
      const slot = await this.slotRepo.findById(numericSlotId);
      if (!slot) throw { statusCode: 404, message: 'Horário de escala não encontrado' };
      const currentCount = await prisma.appointment.count({ where: { slotId: numericSlotId } });
      if (currentCount >= slot.maxCapacity) {
        throw { statusCode: 400, message: 'Este horário de atendimento já atingiu a capacidade máxima' };
      }
    }

    for (const item of items) {
      const medId = Number(item.medicineId);
      const qty = Number(item.quantity);

      if (!medId || isNaN(medId) || !qty || isNaN(qty) || qty <= 0) {
        throw { statusCode: 400, message: 'Todos os medicamentos devem ter ID válido e quantidade positiva' };
      }
      const med = await this.medicineRepo.findById(medId);
      if (!med) {
        throw { statusCode: 404, message: `Medicamento #${medId} não encontrado` };
      }
    }

    let targetPatientId = patientId ? Number(patientId) : undefined;

    if (user.role === 'PACIENTE') {
      const patient = await this.patientRepo.findByUserId(user.userId);
      if (!patient) throw { statusCode: 404, message: 'Perfil de paciente não encontrado' };
      targetPatientId = patient.id;
    } else if (user.role === 'MEDICO') {
      if (patientCpf) {
        const cleanCpf = patientCpf.replace(/\D/g, '');
        let patient = await this.patientRepo.findByCpf(cleanCpf);
        if (!patient && patientName) {
          patient = await this.patientRepo.create({
            name: patientName.trim(),
            cpf: cleanCpf,
          });
        } else if (!patient) {
          throw { statusCode: 400, message: 'Nome do paciente é obrigatório para cadastrar novo prontuário' };
        }
        targetPatientId = patient.id;
      } else if (!targetPatientId) {
        throw { statusCode: 400, message: 'CPF ou ID do paciente é obrigatório' };
      }
    } else {
      if (!targetPatientId) {
        throw { statusCode: 400, message: 'ID do paciente é obrigatório' };
      }
    }

    const appointment = await this.appointmentRepo.create({
      patientId: targetPatientId,
      scheduledDate: parsedDate,
      scheduledTime: scheduledTime?.trim(),
      slotId: numericSlotId,
      notes: notes?.trim(),
      items: items.map(i => ({ medicineId: Number(i.medicineId), quantity: Number(i.quantity) })),
    });

    await this.logService.log(
      user.userId,
      'create',
      'appointments',
      appointment?.id,
      `Criou agendamento de dispensação para paciente #${targetPatientId}`
    );

    return appointment;
  }

  async updateStatus(userId: number, role: string, id: number, status: string, notes?: string) {
    const numericId = Number(id);
    if (!numericId || isNaN(numericId)) {
      throw { statusCode: 400, message: 'ID de agendamento inválido' };
    }

    if (!status || !status.trim()) {
      throw { statusCode: 400, message: 'Status é obrigatório' };
    }

    const appt = await this.appointmentRepo.findById(numericId);
    if (!appt) throw { statusCode: 404, message: 'Agendamento não encontrado' };

    const normalizedStatus = status.trim().toUpperCase();

    if (role === 'PACIENTE') {
      const patient = await this.patientRepo.findByUserId(userId);
      if (!patient || appt.patientId !== patient.id) {
        throw { statusCode: 403, message: 'Acesso não autorizado: você só pode alterar seus próprios agendamentos' };
      }
      if (normalizedStatus !== 'CANCELLED') {
        throw { statusCode: 403, message: 'Pacientes só têm permissão para cancelar seus próprios agendamentos' };
      }
    }

    const updated = await this.appointmentRepo.updateStatus(numericId, normalizedStatus, notes?.trim());

    await this.logService.log(
      userId,
      'update_status',
      'appointments',
      numericId,
      `Atualizou status do agendamento #${numericId} para ${normalizedStatus}`
    );

    return updated;
  }

  async update(userId: number, role: string, id: number, data: {
    scheduledDate?: string | Date;
    scheduledTime?: string;
    slotId?: number;
    notes?: string;
    status?: string;
  }) {
    const numericId = Number(id);
    if (!numericId || isNaN(numericId)) {
      throw { statusCode: 400, message: 'ID de agendamento inválido' };
    }

    const appt = await this.appointmentRepo.findById(numericId);
    if (!appt) throw { statusCode: 404, message: 'Agendamento não encontrado' };

    if (role === 'PACIENTE') {
      const patient = await this.patientRepo.findByUserId(userId);
      if (!patient || appt.patientId !== patient.id) {
        throw { statusCode: 403, message: 'Acesso não autorizado: você só pode alterar seus próprios agendamentos' };
      }
      if (data.status && data.status.trim().toUpperCase() !== 'CANCELLED') {
        throw { statusCode: 403, message: 'Pacientes só têm permissão para cancelar seus próprios agendamentos' };
      }
    }

    const updateData: any = {};
    if (data.scheduledDate) {
      const parsedDate = new Date(data.scheduledDate);
      if (isNaN(parsedDate.getTime())) {
        throw { statusCode: 400, message: 'Data de agendamento inválida' };
      }
      updateData.scheduledDate = parsedDate;
    }

    if (data.scheduledTime !== undefined) updateData.scheduledTime = data.scheduledTime.trim();
    if (data.slotId !== undefined) updateData.slotId = data.slotId ? Number(data.slotId) : null;
    if (data.notes !== undefined) updateData.notes = data.notes.trim();
    if (data.status) updateData.status = data.status.trim().toUpperCase();

    const updated = await this.appointmentRepo.update(numericId, updateData);

    await this.logService.log(
      userId,
      'update',
      'appointments',
      numericId,
      `Atualizou agendamento #${numericId}`
    );

    return updated;
  }

  async delete(userId: number, role: string, id: number) {
    const numericId = Number(id);
    if (!numericId || isNaN(numericId)) {
      throw { statusCode: 400, message: 'ID de agendamento inválido' };
    }

    const appt = await this.appointmentRepo.findById(numericId);
    if (!appt) throw { statusCode: 404, message: 'Agendamento não encontrado' };

    if (role === 'PACIENTE') {
      const patient = await this.patientRepo.findByUserId(userId);
      if (!patient || appt.patientId !== patient.id) {
        throw { statusCode: 403, message: 'Acesso não autorizado ao agendamento' };
      }
    }

    await this.appointmentRepo.delete(numericId);

    await this.logService.log(
      userId,
      'delete',
      'appointments',
      numericId,
      `Cancelou/excluiu agendamento #${numericId}`
    );

    return { message: 'Agendamento cancelado/excluído com sucesso' };
  }
}