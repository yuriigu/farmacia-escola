import { AppointmentRepository } from '../repositories/appointment-repository';
import { ScheduleSlotRepository } from '../repositories/schedule-slot-repository';
import { MedicineRepository } from '../repositories/medicine-repository';
import { PatientRepository } from '../repositories/patient-repository';
import { ActivityLogService } from './activity-log-service';
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
      if (!patient) {
        return [];
      }
      return this.appointmentRepo.findAll(patient.id);
    }

    let targetId = undefined;
    if (patientId !== null && patientId !== undefined) {
      targetId = patientId;
    } else {
      targetId = undefined;
    }
    return this.appointmentRepo.findAll(targetId);
  }

  async getById(id: number, user: { userId: number; role: string }) {
    const numericId = Number(id);
    if (!numericId) {
      throw { statusCode: 400, message: 'ID de agendamento inválido' };
    } else {
      if (isNaN(numericId)) {
        throw { statusCode: 400, message: 'ID de agendamento inválido' };
      }
    }

    const appt = await this.appointmentRepo.findById(numericId);
    if (!appt) {
      throw { statusCode: 404, message: 'Agendamento não encontrado' };
    }

    if (user.role === 'PACIENTE') {
      const patient = await this.patientRepo.findByUserId(user.userId);
      if (!patient) {
        throw { statusCode: 403, message: 'Acesso não autorizado ao agendamento' };
      } else {
        if (appt.patientId !== patient.id) {
          throw { statusCode: 403, message: 'Acesso não autorizado ao agendamento' };
        }
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
    items?: Array<{ medicineId: number; quantity: number }>;
  }) {
    const { scheduledDate, scheduledTime, slotId, patientId, patientName, patientCpf, notes, items } = data;

    if (!scheduledDate) {
      throw { statusCode: 400, message: 'Data do agendamento é obrigatória' };
    }

    const parsedDate = new Date(scheduledDate);
    if (isNaN(parsedDate.getTime())) {
      throw { statusCode: 400, message: 'Data de agendamento inválida' };
    }

    // Escala opcional: registro avulso/presencial (dispensacao imediata) nao exige horario reservado.

    if (!items) {
      throw { statusCode: 400, message: 'Ao menos um medicamento deve ser adicionado ao agendamento' };
    } else {
      if (!Array.isArray(items)) {
        throw { statusCode: 400, message: 'Ao menos um medicamento deve ser adicionado ao agendamento' };
      } else {
        if (items.length === 0) {
          throw { statusCode: 400, message: 'Ao menos um medicamento deve ser adicionado ao agendamento' };
        }
      }
    }

    let numericSlotId = undefined;
    if (slotId) {
      numericSlotId = Number(slotId);
    } else {
      numericSlotId = undefined;
    }

    if (numericSlotId) {
      const slot = await this.slotRepo.findById(numericSlotId);
      if (!slot) {
        throw { statusCode: 404, message: 'Horário de escala não encontrado' };
      }
      const currentCount = await prisma.appointment.count({ where: { slotId: numericSlotId, status: { in: ['PENDING', 'CONFIRMED'] } } });
      if (currentCount >= slot.maxCapacity) {
        throw { statusCode: 400, message: 'Este horário de atendimento já atingiu a capacidade máxima' };
      }
      if (!slot.active) {
        throw { statusCode: 400, message: 'Esta escala não está ativa' };
      }
      const slotDate = new Date(slot.date).toISOString().slice(0, 10);
      if (slotDate !== parsedDate.toISOString().slice(0, 10)) {
        throw { statusCode: 400, message: 'A data não corresponde à escala selecionada' };
      }
    }

    for (const item of items) {
      const medId = Number(item.medicineId);
      const qty = Number(item.quantity);

      if (!medId) {
        throw { statusCode: 400, message: 'Todos os medicamentos devem ter ID válido e quantidade positiva' };
      } else {
        if (isNaN(medId)) {
          throw { statusCode: 400, message: 'Todos os medicamentos devem ter ID válido e quantidade positiva' };
        } else {
          if (!qty) {
            throw { statusCode: 400, message: 'Todos os medicamentos devem ter ID válido e quantidade positiva' };
          } else {
            if (isNaN(qty)) {
              throw { statusCode: 400, message: 'Todos os medicamentos devem ter ID válido e quantidade positiva' };
            } else {
              if (qty <= 0) {
                throw { statusCode: 400, message: 'Todos os medicamentos devem ter ID válido e quantidade positiva' };
              }
            }
          }
        }
      }

      const med = await this.medicineRepo.findById(medId);
      if (!med) {
        throw { statusCode: 404, message: `Medicamento #${medId} não encontrado` };
      }

      const stockInfo = await this.calculateRealAvailableStock(medId);
      if (qty > stockInfo.realAvailableStock) {
        throw {
          statusCode: 400,
          message: `Estoque insuficiente para o medicamento "${med.name}". Solicitado: ${qty}, Disponível real: ${stockInfo.realAvailableStock} (Físico: ${stockInfo.physicalStockTotal}, Reservado: ${stockInfo.reservedQuantity})`,
        };
      }
    }

    let targetPatientId = undefined;
    if (patientId) {
      targetPatientId = Number(patientId);
    } else {
      targetPatientId = undefined;
    }

    if (user.role === 'PACIENTE') {
      const patient = await this.patientRepo.findByUserId(user.userId);
      if (!patient) {
        throw { statusCode: 404, message: 'Perfil de paciente não encontrado' };
      }
      targetPatientId = patient.id;
    } else {
      // ADMIN, FARMACEUTICO, ALUNO, MEDICO: podem criar agendamento para qualquer paciente
      if (patientCpf) {
        const cleanCpf = patientCpf.replace(/\D/g, '');
        let patient = await this.patientRepo.findByCpf(cleanCpf);
        if (!patient) {
          if (patientName) {
            patient = await this.patientRepo.create({
              name: patientName.trim(),
              cpf: cleanCpf,
            });
          } else {
            throw { statusCode: 400, message: 'Nome do paciente é obrigatório para cadastrar novo prontuário' };
          }
        }
        targetPatientId = patient.id;
      } else {
        if (!targetPatientId) {
          throw { statusCode: 400, message: 'CPF ou ID do paciente é obrigatório' };
        }
      }
    }

    let cleanScheduledTime = undefined;
    if (scheduledTime) {
      cleanScheduledTime = scheduledTime.trim();
    } else {
      cleanScheduledTime = undefined;
    }

    let cleanNotes = undefined;
    if (notes) {
      cleanNotes = notes.trim();
    } else {
      cleanNotes = undefined;
    }

    const appointment = await this.appointmentRepo.create({
      patientId: targetPatientId,
      scheduledDate: parsedDate,
      scheduledTime: cleanScheduledTime,
      slotId: numericSlotId,
      notes: cleanNotes,
      items: items.map(i => ({ medicineId: Number(i.medicineId), quantity: Number(i.quantity) })),
    });

    let appointmentLogId = null;
    if (appointment) {
      appointmentLogId = appointment.id;
    } else {
      appointmentLogId = null;
    }

    await this.logService.log(
      user.userId,
      'create',
      'appointments',
      appointmentLogId,
      `Criou agendamento de dispensação para paciente #${targetPatientId}`
    );

    return appointment;
  }

  async updateStatus(userId: number, role: string, id: number, status: string, notes?: string, batchSelections?: Array<{ medicineId: number; batchId: number; quantity: number }>) {
    const numericId = Number(id);
    if (!numericId) {
      throw { statusCode: 400, message: 'ID de agendamento inválido' };
    } else {
      if (isNaN(numericId)) {
        throw { statusCode: 400, message: 'ID de agendamento inválido' };
      }
    }

    if (!status) {
      throw { statusCode: 400, message: 'Status é obrigatório' };
    } else {
      if (!status.trim()) {
        throw { statusCode: 400, message: 'Status é obrigatório' };
      }
    }

    const appt = await this.appointmentRepo.findById(numericId);
    if (!appt) {
      throw { statusCode: 404, message: 'Agendamento não encontrado' };
    }

    const normalizedStatus = status.trim().toUpperCase();

    if (role === 'PACIENTE') {
      const patient = await this.patientRepo.findByUserId(userId);
      if (!patient) {
        throw { statusCode: 403, message: 'Acesso não autorizado: você só pode alterar seus próprios agendamentos' };
      } else {
        if (appt.patientId !== patient.id) {
          throw { statusCode: 403, message: 'Acesso não autorizado: você só pode alterar seus próprios agendamentos' };
        }
      }
      if (normalizedStatus !== 'CANCELLED') {
        throw { statusCode: 403, message: 'Pacientes só têm permissão para cancelar seus próprios agendamentos' };
      }
      if (normalizedStatus === 'CANCELLED' && (!notes || !notes.trim())) {
        throw { statusCode: 400, message: 'A justificativa do cancelamento é obrigatória' };
      }
    }

    if (normalizedStatus === 'CANCELLED' && (!notes || !notes.trim())) {
      throw { statusCode: 400, message: 'A justificativa do cancelamento é obrigatória' };
    }

    let cleanNotes = undefined;
    if (notes) {
      cleanNotes = notes.trim();
    } else {
      cleanNotes = undefined;
    }

    if (normalizedStatus === 'COMPLETED') {
      if (!appt.patient) {
        throw { statusCode: 400, message: 'O paciente do agendamento não foi encontrado' };
      }
      if (!appt.items) {
        throw { statusCode: 400, message: 'O agendamento não possui medicamentos para dispensação' };
      } else {
        if (appt.items.length === 0) {
          throw { statusCode: 400, message: 'O agendamento não possui medicamentos para dispensação' };
        }
      }

      const dispenseItems = this.resolveDispenseItems(appt.items, batchSelections);

      const updatedAppointment = await prisma.$transaction(async (tx) => {
        let firstBatchId: number | null = null;

        for (let i = 0; i < dispenseItems.length; i++) {
          const item = dispenseItems[i];
          let chosenBatchId: number | null = null;
          if (item.batchId) {
            chosenBatchId = Number(item.batchId);
          } else {
            chosenBatchId = null;
          }

          if (chosenBatchId) {
            const batch = await tx.stockBatch.findUnique({
              where: { id: chosenBatchId },
            });
            if (!batch) {
              throw { statusCode: 404, message: `Lote #${chosenBatchId} não encontrado` };
            }
            if (batch.isBlocked) {
              throw { statusCode: 400, message: `Lote ${batch.batchNumber} está bloqueado para uso` };
            }
            if (new Date(batch.expirationDate).getTime() < new Date().getTime()) {
              throw { statusCode: 400, message: `Lote ${batch.batchNumber} está vencido` };
            }
            if (batch.currentQuantity < item.quantity) {
              throw { statusCode: 400, message: `Saldo insuficiente no lote ${batch.batchNumber}. Disponível: ${batch.currentQuantity}, Solicitado: ${item.quantity}` };
            }

            await tx.stockBatch.update({
              where: { id: chosenBatchId },
              data: {
                currentQuantity: batch.currentQuantity - item.quantity,
              },
            });

            await tx.stockMovement.create({
              data: {
                batchId: chosenBatchId,
                type: 'DISPENSE',
                quantity: item.quantity,
                notes: `Dispensação agendamento #${numericId} para paciente #${appt.patientId}`,
                userId: userId,
              },
            });

            if (!firstBatchId) {
              firstBatchId = chosenBatchId;
            }

            if (appt.items[i]) {
              await tx.appointmentItem.update({
                where: { id: appt.items[i].id },
                data: { batchId: chosenBatchId },
              });
            }
          } else {
            let medicineId = null;
            if (item.medicineId) {
              medicineId = item.medicineId;
            } else {
              if (appt.items[i]) {
                medicineId = appt.items[i].medicineId;
              }
            }

            if (!medicineId) {
              throw { statusCode: 400, message: 'Medicamento não identificado para dispensação' };
            }

            const activeBatches = await tx.stockBatch.findMany({
              where: {
                medicineId: medicineId,
                currentQuantity: { gt: 0 },
                isBlocked: false,
                expirationDate: { gte: new Date() },
              },
              orderBy: { expirationDate: 'asc' },
            });

            let remainingQty = item.quantity;
            let allocatedBatchId: number | null = null;

            for (let b = 0; b < activeBatches.length; b++) {
              if (remainingQty <= 0) {
                break;
              }
              const currentBatch = activeBatches[b];
              let deduct = 0;
              if (currentBatch.currentQuantity >= remainingQty) {
                deduct = remainingQty;
              } else {
                deduct = currentBatch.currentQuantity;
              }

              await tx.stockBatch.update({
                where: { id: currentBatch.id },
                data: {
                  currentQuantity: currentBatch.currentQuantity - deduct,
                },
              });

              await tx.stockMovement.create({
                data: {
                  batchId: currentBatch.id,
                  type: 'DISPENSE',
                  quantity: deduct,
                  notes: `Dispensação FEFO agendamento #${numericId} para paciente #${appt.patientId}`,
                  userId: userId,
                },
              });

              if (!allocatedBatchId) {
                allocatedBatchId = currentBatch.id;
              }
              if (!firstBatchId) {
                firstBatchId = currentBatch.id;
              }

              remainingQty = remainingQty - deduct;
            }

            if (remainingQty > 0) {
              throw { statusCode: 400, message: `Estoque insuficiente para o medicamento #${medicineId}. Faltam ${remainingQty} unidade(s)` };
            }

            if (appt.items[i]) {
              await tx.appointmentItem.update({
                where: { id: appt.items[i].id },
                data: { batchId: allocatedBatchId },
              });
            }
          }
        }

        let updatedNotes = appt.notes;
        if (cleanNotes) {
          updatedNotes = cleanNotes;
        }

        const updated = await tx.appointment.update({
          where: { id: numericId },
          data: {
            status: 'COMPLETED',
            notes: updatedNotes,
            dispensedByUserId: userId,
            dispensedAt: new Date(),
            batchId: firstBatchId,
          },
          include: {
            patient: true,
            slot: {
              include: {
                assignedTo: { select: { id: true, name: true, role: true } },
              },
            },
            batch: {
              include: {
                medicine: true,
              },
            },
            dispensedByUser: {
              select: { id: true, name: true, role: true },
            },
            items: {
              include: {
                medicine: true,
                batch: {
                  include: {
                    medicine: true,
                  },
                },
              },
            },
          },
        });

        return updated;
      });

      await this.logService.log(
        userId,
        'update_status',
        'appointments',
        numericId,
        `Atualizou status do agendamento #${numericId} para ${normalizedStatus}`
      );

      return updatedAppointment;
    }

    const updated = await this.appointmentRepo.updateStatus(numericId, normalizedStatus, cleanNotes);

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
    if (!numericId) {
      throw { statusCode: 400, message: 'ID de agendamento inválido' };
    } else {
      if (isNaN(numericId)) {
        throw { statusCode: 400, message: 'ID de agendamento inválido' };
      }
    }

    const appt = await this.appointmentRepo.findById(numericId);
    if (!appt) {
      throw { statusCode: 404, message: 'Agendamento não encontrado' };
    }

    if (role === 'PACIENTE') {
      const patient = await this.patientRepo.findByUserId(userId);
      if (!patient) {
        throw { statusCode: 403, message: 'Acesso não autorizado: você só pode alterar seus próprios agendamentos' };
      } else {
        if (appt.patientId !== patient.id) {
          throw { statusCode: 403, message: 'Acesso não autorizado: você só pode alterar seus próprios agendamentos' };
        }
      }
      if (data.status) {
        if (data.status.trim().toUpperCase() !== 'CANCELLED') {
          throw { statusCode: 403, message: 'Pacientes só têm permissão para cancelar seus próprios agendamentos' };
        }
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

    if (data.scheduledTime !== undefined) {
      updateData.scheduledTime = data.scheduledTime.trim();
    }
    if (data.slotId !== undefined) {
      let parsedSlotId = null;
      if (data.slotId) {
        parsedSlotId = Number(data.slotId);
      } else {
        parsedSlotId = null;
      }
      updateData.slotId = parsedSlotId;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes.trim();
    }
    if (data.status) {
      updateData.status = data.status.trim().toUpperCase();
    }

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
    if (!numericId) {
      throw { statusCode: 400, message: 'ID de agendamento inválido' };
    } else {
      if (isNaN(numericId)) {
        throw { statusCode: 400, message: 'ID de agendamento inválido' };
      }
    }

    const appt = await this.appointmentRepo.findById(numericId);
    if (!appt) {
      throw { statusCode: 404, message: 'Agendamento não encontrado' };
    }

    if (role === 'PACIENTE') {
      const patient = await this.patientRepo.findByUserId(userId);
      if (!patient) {
        throw { statusCode: 403, message: 'Acesso não autorizado ao agendamento' };
      } else {
        if (appt.patientId !== patient.id) {
          throw { statusCode: 403, message: 'Acesso não autorizado ao agendamento' };
        }
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

  private resolveDispenseItems(
    appointmentItems: Array<{ medicineId: number; quantity: number }>,
    batchSelections?: Array<{ medicineId: number; batchId: number; quantity: number }>
  ): Array<{ medicineId?: number; batchId?: number; quantity: number }> {
    if (!batchSelections || batchSelections.length === 0) {
      return appointmentItems.map((item) => ({ medicineId: item.medicineId, quantity: item.quantity }));
    }
    const normalized = batchSelections.map((s) => ({
      medicineId: Number(s.medicineId),
      batchId: Number(s.batchId),
      quantity: Number(s.quantity),
    }));
    for (const item of appointmentItems) {
      const total = normalized.filter((s) => s.medicineId === Number(item.medicineId)).reduce((acc, s) => acc + s.quantity, 0);
      if (total !== Number(item.quantity)) {
        throw { statusCode: 400, message: 'A quantidade dispensada por lote deve corresponder a quantidade do agendamento' };
      }
    }
    if (normalized.length !== appointmentItems.length && normalized.length > 0) {
      const expected = appointmentItems.reduce((acc, i) => acc + Number(i.quantity), 0);
      const got = normalized.reduce((acc, s) => acc + s.quantity, 0);
      if (got !== expected) {
        throw { statusCode: 400, message: 'A quantidade total dos lotes deve corresponder ao agendamento' };
      }
    }
    return normalized;
  }

  async revertDispense(userId: number, role: string, id: number, reason: string) {
    const numericId = Number(id);
    if (!numericId) {
      throw { statusCode: 400, message: 'ID de agendamento inválido' };
    } else {
      if (isNaN(numericId)) {
        throw { statusCode: 400, message: 'ID de agendamento inválido' };
      }
    }
    let cleanReason = '';
    if (reason) {
      cleanReason = reason.trim();
    }
    if (!cleanReason) {
      throw { statusCode: 400, message: 'O motivo do estorno é obrigatório' };
    }
    let allowed = false;
    if (role === 'ADMIN') {
      allowed = true;
    } else {
      if (role === 'FARMACEUTICO') {
        allowed = true;
      }
    }
    if (!allowed) {
      throw { statusCode: 403, message: 'Apenas administradores e farmacêuticos podem estornar dispensações' };
    }
    const appt = await this.appointmentRepo.findById(numericId);
    if (!appt) {
      throw { statusCode: 404, message: 'Agendamento não encontrado' };
    }
    if (appt.status !== 'COMPLETED') {
      throw { statusCode: 400, message: 'Somente agendamentos concluídos podem ser estornados' };
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (appt.items) {
        for (let i = 0; i < appt.items.length; i++) {
          const item = appt.items[i];
          let targetBatchId = null;
          if (item.batchId) {
            targetBatchId = item.batchId;
          } else {
            if (appt.batchId) {
              targetBatchId = appt.batchId;
            }
          }

          if (targetBatchId) {
            const batch = await tx.stockBatch.findUnique({
              where: { id: targetBatchId },
            });
            if (batch) {
              await tx.stockBatch.update({
                where: { id: targetBatchId },
                data: {
                  currentQuantity: batch.currentQuantity + item.quantity,
                },
              });

              await tx.stockMovement.create({
                data: {
                  batchId: targetBatchId,
                  type: 'REVERT',
                  quantity: item.quantity,
                  notes: `Estorno agendamento #${numericId}. Motivo: ${cleanReason}`,
                  userId: userId,
                },
              });
            }
          }
        }
      }

      return tx.appointment.update({
        where: { id: numericId },
        data: {
          status: 'CONFIRMED',
          dispensedByUserId: null,
          dispensedAt: null,
          notes: `Estornada dispensação em ${new Date().toISOString()}. Motivo: ${cleanReason}`,
        },
        include: {
          patient: true,
          slot: {
            include: {
              assignedTo: { select: { id: true, name: true, role: true } },
            },
          },
          batch: {
            include: {
              medicine: true,
            },
          },
          dispensedByUser: {
            select: { id: true, name: true, role: true },
          },
          items: {
            include: {
              medicine: true,
              batch: {
                include: {
                  medicine: true,
                },
              },
            },
          },
        },
      });
    });

    await this.logService.log(
      userId,
      'revert_dispense',
      'appointments',
      numericId,
      `Estornou dispensação do agendamento #${numericId}. Motivo: ${cleanReason}`
    );
    return updated;
  }

  async calculateRealAvailableStock(medicineId: number): Promise<{
    physicalStockTotal: number;
    reservedQuantity: number;
    realAvailableStock: number;
  }> {
    const med = await this.medicineRepo.findById(medicineId);
    if (!med) {
      throw { statusCode: 404, message: `Medicamento #${medicineId} não encontrado` };
    }

    const now = new Date();
    let physicalStockTotal = 0;

    let activeBatches: any[] = [];
    try {
      activeBatches = await prisma.stockBatch.findMany({
        where: {
          medicineId: medicineId,
          currentQuantity: { gt: 0 },
          expirationDate: { gte: now },
          isBlocked: false,
        },
      });
    } catch (dbErr) {
      activeBatches = [];
    }

    if (activeBatches) {
      if (Array.isArray(activeBatches)) {
        if (activeBatches.length > 0) {
          for (let b = 0; b < activeBatches.length; b++) {
            physicalStockTotal = physicalStockTotal + activeBatches[b].currentQuantity;
          }
        }
      }
    }

    if (physicalStockTotal === 0) {
      if (med) {
        let batchesFound = false;
        if (med.batches) {
          if (Array.isArray(med.batches)) {
            if (med.batches.length > 0) {
              batchesFound = true;
              for (let b = 0; b < med.batches.length; b++) {
                const bItem = med.batches[b];
                if (!bItem.isBlocked) {
                  const expTime = new Date(bItem.expirationDate).getTime();
                  if (expTime >= now.getTime()) {
                    if (bItem.currentQuantity > 0) {
                      physicalStockTotal = physicalStockTotal + bItem.currentQuantity;
                    }
                  }
                }
              }
            }
          }
        }
        if (!batchesFound) {
          if (typeof (med as any).totalQuantity === 'number') {
            if ((med as any).totalQuantity > 0) {
              physicalStockTotal = (med as any).totalQuantity;
            }
          }
        }
      }
    }

    let reservedQuantity = 0;
    try {
      const pendingItems = await prisma.appointmentItem.findMany({
        where: {
          medicineId: medicineId,
          appointment: {
            status: {
              in: ['PENDING', 'CONFIRMED'],
            },
          },
        },
        select: {
          quantity: true,
        },
      });
      if (pendingItems) {
        if (Array.isArray(pendingItems)) {
          for (let p = 0; p < pendingItems.length; p++) {
            reservedQuantity = reservedQuantity + pendingItems[p].quantity;
          }
        }
      }
    } catch (dbErr) {
      reservedQuantity = 0;
    }

    let realAvailableStock = physicalStockTotal - reservedQuantity;
    if (realAvailableStock < 0) {
      realAvailableStock = 0;
    }

    return {
      physicalStockTotal: physicalStockTotal,
      reservedQuantity: reservedQuantity,
      realAvailableStock: realAvailableStock,
    };
  }
}
