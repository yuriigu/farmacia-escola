import { AppointmentRepository } from '../repositories/AppointmentRepository';
import { ScheduleSlotRepository } from '../repositories/ScheduleSlotRepository';
import { MedicineRepository } from '../repositories/MedicineRepository';
import { PatientRepository } from '../repositories/PatientRepository';
import { ActivityLogService } from './ActivityLogService';
import { prisma } from '../utils/prisma';

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
    return this.appointmentRepo.findAll();
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

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw { statusCode: 400, message: 'Ao menos um medicamento deve ser adicionado ao agendamento' };
    }

    if (slotId) {
      const slot = await this.slotRepo.findById(slotId);
      if (!slot) throw { statusCode: 404, message: 'Horário de escala não encontrado' };
      const currentCount = await prisma.appointment.count({ where: { slotId } });
      if (currentCount >= slot.maxCapacity) {
        throw { statusCode: 400, message: 'Este horário de atendimento já atingiu a capacidade máxima' };
      }
    }

    for (const item of items) {
      if (!item.medicineId || !item.quantity || item.quantity <= 0) {
        throw { statusCode: 400, message: 'Todos os medicamentos devem ter ID válido e quantidade positiva' };
      }
      const med = await this.medicineRepo.findById(item.medicineId);
      if (!med) {
        throw { statusCode: 404, message: `Medicamento #${item.medicineId} não encontrado` };
      }
    }

    let targetPatientId = patientId;

    if (user.role === 'PACIENTE') {
      const patient = await this.patientRepo.findByUserId(user.userId);
      if (!patient) throw { statusCode: 404, message: 'Perfil de paciente não encontrado' };
      targetPatientId = patient.id;
    } else if (user.role === 'MEDICO') {
      if (patientCpf) {
        let patient = await this.patientRepo.findByCpf(patientCpf);
        if (!patient && patientName) {
          patient = await this.patientRepo.create({
            name: patientName,
            cpf: patientCpf,
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
      patientId: targetPatientId!,
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      slotId,
      notes,
      items,
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
    const appt = await this.appointmentRepo.findById(id);
    if (!appt) throw { statusCode: 404, message: 'Agendamento não encontrado' };

    const updated = await this.appointmentRepo.updateStatus(id, status, notes);

    await this.logService.log(
      userId,
      'update_status',
      'appointments',
      id,
      `Atualizou status do agendamento #${id} para ${status}`
    );

    return updated;
  }
}
