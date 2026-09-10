import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/AuthMiddleware';
import { WithdrawalService } from '../services/WithdrawalService';
import { prisma } from '../utils/Prisma';
import { withdrawalCancelSchema, withdrawalCreateSchema, withdrawalUpdateSchema } from '../middlewares/ValidationMiddleware';

export class WithdrawalController {
  private withdrawalService: WithdrawalService;

  constructor() {
    this.withdrawalService = new WithdrawalService();
  }

  getAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const userId = req.user.userId;
      const role = req.user.role;
      let patientId: number | null = null;

      if (role === 'PACIENTE') {
        const patientRecord = await prisma.patient.findUnique({
          where: { userId: userId },
        });
        if (!patientRecord) {
          res.json([]);
          return;
        } else {
          patientId = patientRecord.id;
        }
      }

      const withdrawals = await this.withdrawalService.getAll(role, patientId);
      res.json(withdrawals);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar dispensações' });
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
      const userId = req.user.userId;
      const role = req.user.role;
      const id = Number(req.params.id);

      if (!id) {
        res.status(400).json({ error: 'ID de dispensação inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de dispensação inválido' });
          return;
        }
      }

      const withdrawalRecord = await prisma.withdrawal.findUnique({
        where: { id: id },
        include: {
          patient: true,
        },
      });

      if (!withdrawalRecord) {
        res.status(404).json({ error: 'Dispensação não encontrada' });
        return;
      }

      if (role === 'PACIENTE') {
        const patientRecord = await prisma.patient.findUnique({
          where: { userId: userId },
        });

        if (!patientRecord) {
          res.status(403).json({ error: 'Acesso não autorizado à dispensação' });
          return;
        } else {
          if (withdrawalRecord.patientId !== patientRecord.id) {
            res.status(403).json({ error: 'Acesso não autorizado à dispensação' });
            return;
          }
        }
      }

      let patientId: number | null = null;
      if (role === 'PACIENTE') {
        const patientRecord = await prisma.patient.findUnique({
          where: { userId: userId },
        });
        if (patientRecord) {
          patientId = patientRecord.id;
        }
      }

      const withdrawal = await this.withdrawalService.getById(id, role, patientId);
      res.json(withdrawal);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar dispensação' });
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

      let isAllowedRole = false;
      if (role === 'ADMIN') {
        isAllowedRole = true;
      } else {
        if (role === 'FARMACEUTICO') {
          isAllowedRole = true;
        } else {
          if (role === 'ALUNO') {
            isAllowedRole = true;
          } else {
            isAllowedRole = false;
          }
        }
      }

      if (!isAllowedRole) {
        res.status(403).json({ error: 'Acesso negado para este perfil de usuário' });
        return;
      }

      const validationResult = withdrawalCreateSchema.safeParse(req.body);
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

      const validatedData = validationResult.data;

      const withdrawal = await this.withdrawalService.create(userId, role, validatedData as any);
      res.status(201).json(withdrawal);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao registrar dispensação' });
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
        res.status(400).json({ error: 'ID de dispensação inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de dispensação inválido' });
          return;
        }
      }

      let isAllowedRole = false;
      if (role === 'ADMIN') {
        isAllowedRole = true;
      } else {
        if (role === 'FARMACEUTICO') {
          isAllowedRole = true;
        } else {
          if (role === 'ALUNO') {
            isAllowedRole = true;
          } else {
            isAllowedRole = false;
          }
        }
      }

      if (!isAllowedRole) {
        res.status(403).json({ error: 'Acesso negado para este perfil de usuário' });
        return;
      }

      const existingRecord = await prisma.withdrawal.findUnique({
        where: { id: id },
      });

      if (!existingRecord) {
        res.status(404).json({ error: 'Dispensação não encontrada' });
        return;
      }

      const validationResult = withdrawalUpdateSchema.safeParse(req.body);
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

      const updated = await this.withdrawalService.update(userId, role, id, validationResult.data);
      res.json(updated);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao atualizar dispensação' });
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
        res.status(400).json({ error: 'ID de dispensação inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de dispensação inválido' });
          return;
        }
      }

      let isAllowedRole = false;
      if (role === 'ADMIN') {
        isAllowedRole = true;
      } else {
        if (role === 'FARMACEUTICO') {
          isAllowedRole = true;
        } else {
          isAllowedRole = false;
        }
      }

      if (!isAllowedRole) {
        res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem estornar dispensações' });
        return;
      }

      const existingRecord = await prisma.withdrawal.findUnique({
        where: { id: id },
      });

      if (!existingRecord) {
        res.status(404).json({ error: 'Dispensação não encontrada' });
        return;
      }

      const result = await this.withdrawalService.delete(userId, role, id);
      res.json(result);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao estornar dispensação' });
        return;
      }
    }
  };

  cancel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const id = Number(req.params.id);
      if (!id) {
        res.status(400).json({ error: 'ID de dispensação inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de dispensação inválido' });
          return;
        }
      }

      const role = req.user.role;
      let isAllowedRole = false;
      if (role === 'ADMIN') {
        isAllowedRole = true;
      } else {
        if (role === 'FARMACEUTICO') {
          isAllowedRole = true;
        }
      }
      if (!isAllowedRole) {
        res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem estornar dispensações' });
        return;
      }

      const validationResult = withdrawalCancelSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({ error: 'O motivo do cancelamento é obrigatório', details: validationResult.error.issues });
        return;
      }

      const result = await this.withdrawalService.cancel(req.user.userId, role, id, validationResult.data.cancelReason);
      res.json(result);
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao estornar dispensação' });
        return;
      }
    }
  };
}