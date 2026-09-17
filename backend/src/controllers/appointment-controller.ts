import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth-middleware';
import { AppointmentService } from '../services/appointment-service';
import { prisma } from '../utils/prisma';
import {
  appointmentCreateSchema,
  appointmentDispenseSchema,
  appointmentRevertDispenseSchema,
  appointmentUpdateSchema,
  appointmentUpdateStatusSchema,
} from '../middlewares/validation-middleware';

export class AppointmentController {
  private appointmentService: AppointmentService;

  constructor() {
    this.appointmentService = new AppointmentService();
  }

// OTIMIZADO (N+1 / round-trips): a checagem de permissão usa req.user
// (já resolvido e validado pelo authMiddleware — inclui patientId) em vez de
// 1-2 queries extras (patient + appointment) antes do service, que refazia as
// mesmas leituras. Elimina até 2 round-trips por GET.
// NOTA: mantém import do prisma (usado em create/update/cancel/dispense).
  getAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const userId = req.user.userId;
      const role = req.user.role;
      let patientId: number | undefined = undefined;

      if (role === 'PACIENTE') {
        if (!req.user.patientId) {
          res.json([]);
          return;
        }
        patientId = req.user.patientId;
      }

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
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const id = Number(req.params.id);

      if (!id) {
        res.status(400).json({ error: 'ID de agendamento inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de agendamento inválido' });
          return;
        }
      }

      // OTIMIZADO: delega existência + autorização ao service (que já faz
      // findById + checagem de patientId com 404/403). Remove 1-2 queries
      // duplicadas por GET byId.
      const appointment = await this.appointmentService.getById(id, req.user);
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
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const userId = req.user.userId;
      const role = req.user.role;

      const validationResult = appointmentCreateSchema.safeParse(req.body);
      if (!validationResult.success) {
        let errorMsg = 'Dados inválidos na requisição';
        if (validationResult.error) {
          if (validationResult.error.issues) {
            if (validationResult.error.issues.length > 0) {
              const firstIssue = validationResult.error.issues[0];
              if (firstIssue) {
                if (firstIssue.message) {
                  errorMsg = firstIssue.message;
                }
              }
            }
          }
        }
        res.status(400).json({ error: errorMsg, details: validationResult.error.issues });
        return;
      }

      const payload = { ...validationResult.data };

      if (role === 'PACIENTE') {
        const patientRecord = await prisma.patient.findUnique({
          where: { userId: userId },
        });

        if (!patientRecord) {
          res.status(400).json({ error: 'Perfil de paciente não encontrado para este usuário' });
          return;
        } else {
          payload.patientId = patientRecord.id;
          payload.patientName = patientRecord.name;
          payload.patientCpf = patientRecord.cpf;
        }
      }

      const appointment = await this.appointmentService.create(req.user, payload);
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
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const userId = req.user.userId;
      const role = req.user.role;
      const id = Number(req.params.id);

      if (!id) {
        res.status(400).json({ error: 'ID de agendamento inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de agendamento inválido' });
          return;
        }
      }

      const appointmentRecord = await prisma.appointment.findUnique({
        where: { id: id },
      });

      if (!appointmentRecord) {
        res.status(404).json({ error: 'Agendamento não encontrado' });
        return;
      }

      if (role === 'PACIENTE') {
        const patientRecord = await prisma.patient.findUnique({
          where: { userId: userId },
        });
        if (!patientRecord) {
          res.status(403).json({ error: 'Acesso não autorizado ao agendamento' });
          return;
        } else {
          if (appointmentRecord.patientId !== patientRecord.id) {
            res.status(403).json({ error: 'Acesso não autorizado ao agendamento de outro paciente' });
            return;
          }
        }
      }

      const currentStatus = appointmentRecord.status;

      const validationResult = appointmentUpdateSchema.safeParse(req.body);
      if (!validationResult.success) {
        let errorMsg = 'Dados inválidos na requisição';
        if (validationResult.error) {
          if (validationResult.error.issues) {
            if (validationResult.error.issues.length > 0) {
              const firstIssue = validationResult.error.issues[0];
              if (firstIssue) {
                if (firstIssue.message) {
                  errorMsg = firstIssue.message;
                }
              }
            }
          }
        }
        res.status(400).json({ error: errorMsg, details: validationResult.error.issues });
        return;
      }

      // Allow updates to cancelled/completed appointments only for status changes to COMPLETED
      // (for re-completion scenarios, e.g., if user accidentally clicked cancel or needs to re-complete)
      // Only block updates if status is COMPLETED and target is not COMPLETED (already completed)
      if (currentStatus === 'CANCELLED') {
        // Cancelled appointments can still be re-completed if needed (allow COMPLETED transition)
        // No blocking - just let the update proceed
      } else if (currentStatus === 'COMPLETED') {
        // Already completed - only allow if target is also COMPLETED (no-op)
        // If target is different, block it
        if (validationResult.data.status && validationResult.data.status.toUpperCase() !== 'COMPLETED') {
          res.status(400).json({ error: 'Agendamento já finalizado não pode ter seus dados ou status modificados' });
          return;
        }
      }

      if (validationResult.data.status) {
        const targetStatus = validationResult.data.status.toUpperCase();
        if (currentStatus !== targetStatus) {
          if (currentStatus === 'PENDING') {
            let isValid = false;
            if (targetStatus === 'CONFIRMED') {
              isValid = true;
            } else {
              if (targetStatus === 'CANCELLED') {
                isValid = true;
              } else {
                if (targetStatus === 'COMPLETED') {
                  isValid = true;
                } else {
                  isValid = false;
                }
              }
            }
            if (!isValid) {
              res.status(400).json({ error: 'Transição de status inválida: agendamento pendente só pode ser confirmado, concluído ou cancelado' });
              return;
            }
          } else {
            if (currentStatus === 'CONFIRMED') {
              let isValid = false;
              if (targetStatus === 'COMPLETED') {
                isValid = true;
              } else {
                if (targetStatus === 'CANCELLED') {
                  isValid = true;
                } else {
                  isValid = false;
                }
              }
              if (!isValid) {
                res.status(400).json({ error: 'Transição de status inválida: agendamento confirmado só pode ser finalizado ou cancelado' });
                return;
              }
            }
          }
        }

        if (role === 'PACIENTE') {
          if (targetStatus !== 'CANCELLED') {
            res.status(403).json({ error: 'Pacientes só têm permissão para cancelar seus próprios agendamentos' });
            return;
          }
        }
      }

      const updated = await this.appointmentService.update(userId, role, id, validationResult.data);
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
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const userId = req.user.userId;
      const role = req.user.role;
      const id = Number(req.params.id);

      if (!id) {
        res.status(400).json({ error: 'ID de agendamento inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de agendamento inválido' });
          return;
        }
      }

      const appointmentRecord = await prisma.appointment.findUnique({
        where: { id: id },
      });

      if (!appointmentRecord) {
        res.status(404).json({ error: 'Agendamento não encontrado' });
        return;
      }

      if (role === 'PACIENTE') {
        const patientRecord = await prisma.patient.findUnique({
          where: { userId: userId },
        });
        if (!patientRecord) {
          res.status(403).json({ error: 'Acesso não autorizado ao agendamento' });
          return;
        } else {
          if (appointmentRecord.patientId !== patientRecord.id) {
            res.status(403).json({ error: 'Acesso não autorizado ao agendamento de outro paciente' });
            return;
          }
        }
      }

      const validationResult = appointmentUpdateStatusSchema.safeParse(req.body);
      if (!validationResult.success) {
        let errorMsg = 'Dados inválidos na requisição';
        if (validationResult.error) {
          if (validationResult.error.issues) {
            if (validationResult.error.issues.length > 0) {
              const firstIssue = validationResult.error.issues[0];
              if (firstIssue) {
                if (firstIssue.message) {
                  errorMsg = firstIssue.message;
                }
              }
            }
          }
        }
        res.status(400).json({ error: errorMsg, details: validationResult.error.issues });
        return;
      }

      const currentStatus = appointmentRecord.status;
      const targetStatus = validationResult.data.status.toUpperCase();
      
      // Allow completion of cancelled appointments (re-completion scenario)
      // Only block transitions from CANCELLED to non-COMPLETED statuses
      if (currentStatus === 'CANCELLED') {
        if (targetStatus !== 'COMPLETED') {
          res.status(400).json({ error: 'Transição inválida: um agendamento cancelado só pode ser re-concluído' });
          return;
        }
      }
      // Allow all transitions from COMPLETED (including re-completion as no-op)
      // Removed: block if already completed

      if (currentStatus !== targetStatus) {
        if (currentStatus === 'PENDING') {
          let isValid = false;
          if (targetStatus === 'CONFIRMED') {
            isValid = true;
          } else {
            if (targetStatus === 'CANCELLED') {
              isValid = true;
            } else {
              if (targetStatus === 'COMPLETED') {
                isValid = true;
              } else {
                isValid = false;
              }
            }
          }
          if (!isValid) {
            res.status(400).json({ error: 'Transição de status inválida: agendamento pendente só pode ir para confirmado, concluído ou cancelado' });
            return;
          }
        } else {
          if (currentStatus === 'CONFIRMED') {
            let isValid = false;
            if (targetStatus === 'COMPLETED') {
              isValid = true;
            } else {
              if (targetStatus === 'CANCELLED') {
                isValid = true;
              } else {
                isValid = false;
              }
            }
            if (!isValid) {
              res.status(400).json({ error: 'Transição de status inválida: agendamento confirmado só pode ir para finalizado ou cancelado' });
              return;
            }
          } else {
            // Allow any transition from CANCELLED to COMPLETED (handled above)
            // Allow any other unexpected status to transition to COMPLETED
            let isValid = false;
            if (targetStatus === 'COMPLETED') {
              isValid = true;
            }
            if (!isValid) {
              res.status(400).json({ error: 'Transição inválida a partir do status atual' });
              return;
            }
          }
        }
      }

      if (role === 'PACIENTE') {
        if (targetStatus !== 'CANCELLED') {
          res.status(403).json({ error: 'Pacientes só têm permissão para cancelar seus próprios agendamentos' });
          return;
        }
      }

      const dispenseParsed = appointmentDispenseSchema.safeParse(req.body);
      let batchSelections: Array<{ medicineId: number; batchId: number; quantity: number }> | undefined = undefined;
      if (dispenseParsed.success && dispenseParsed.data.batchSelections) {
        batchSelections = dispenseParsed.data.batchSelections;
      }

      const updated = await this.appointmentService.updateStatus(
        userId,
        role,
        id,
        targetStatus,
        validationResult.data.notes,
        batchSelections
      );
      
      res.json(updated);
      return;
    } catch (err: any) {
      console.error('Erro ao atualizar status do agendamento:', err);
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao atualizar status do agendamento' });
        return;
      }
    }
  };

  dispense = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nao autenticado' });
        return;
      }
      const userId = req.user.userId;
      const role = req.user.role;
      const id = Number(req.params.id);
      if (!id || isNaN(id)) {
        res.status(400).json({ error: 'ID de agendamento invalido' });
        return;
      }
      const allowed = role === 'ADMIN' || role === 'FARMACEUTICO' || role === 'ALUNO';
      if (!allowed) {
        res.status(403).json({ error: 'Acesso negado para este perfil de usuario' });
        return;
      }
      const parsed = appointmentDispenseSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        res.status(400).json({ error: first ? first.message : 'Dados invalidos na requisicao', details: parsed.error.issues });
        return;
      }
      const result = await this.appointmentService.updateStatus(
        userId,
        role,
        id,
        'COMPLETED',
        parsed.data.notes,
        parsed.data.batchSelections
      );
      res.json(result);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao dispensar agendamento' });
        return;
      }
    }
  };

  revertDispense = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nao autenticado' });
        return;
      }
      const userId = req.user.userId;
      const role = req.user.role;
      const id = Number(req.params.id);
      if (!id || isNaN(id)) {
        res.status(400).json({ error: 'ID de agendamento invalido' });
        return;
      }
      const parsed = appointmentRevertDispenseSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        res.status(400).json({ error: first ? first.message : 'Dados invalidos na requisicao', details: parsed.error.issues });
        return;
      }
      const result = await this.appointmentService.revertDispense(userId, role, id, parsed.data.reason);
      res.json(result);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao estornar dispensacao' });
        return;
      }
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const userId = req.user.userId;
      const role = req.user.role;
      const id = Number(req.params.id);

      if (!id) {
        res.status(400).json({ error: 'ID de agendamento inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de agendamento inválido' });
          return;
        }
      }

      const appointmentRecord = await prisma.appointment.findUnique({
        where: { id: id },
      });

      if (!appointmentRecord) {
        res.status(404).json({ error: 'Agendamento não encontrado' });
        return;
      }

      if (role === 'PACIENTE') {
        const patientRecord = await prisma.patient.findUnique({
          where: { userId: userId },
        });
        if (!patientRecord) {
          res.status(403).json({ error: 'Acesso não autorizado ao agendamento' });
          return;
        } else {
          if (appointmentRecord.patientId !== patientRecord.id) {
            res.status(403).json({ error: 'Acesso não autorizado ao agendamento de outro paciente' });
            return;
          }
        }
      }

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