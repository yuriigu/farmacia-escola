import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth-middleware';
import { MedicineService } from '../services/medicine-service';
import { prisma } from '../utils/prisma';
import { medicineCreateSchema, medicineUpdateSchema } from '../middlewares/validation-middleware';

export class MedicineController {
  private medicineService: MedicineService;

  constructor() {
    this.medicineService = new MedicineService();
  }

  getAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const medicines = await this.medicineService.getAll();
      res.json(medicines);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar medicamentos' });
        return;
      }
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      if (!id) {
        res.status(400).json({ error: 'ID de medicamento inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de medicamento inválido' });
          return;
        }
      }

      const medicineRecord = await prisma.medicine.findFirst({
        where: { id: id, deletedAt: null },
      });

      if (!medicineRecord) {
        res.status(404).json({ error: 'Medicamento não encontrado' });
        return;
      }

      const medicine = await this.medicineService.getById(id);
      res.json(medicine);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar medicamento' });
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

      let isAllowed = false;
      if (role === 'ADMIN') {
        isAllowed = true;
      } else {
        if (role === 'FARMACEUTICO') {
          isAllowed = true;
        } else {
          if (role === 'ALUNO') {
            isAllowed = true;
          } else {
            isAllowed = false;
          }
        }
      }

      if (!isAllowed) {
        res.status(403).json({ error: 'Acesso negado para cadastro de medicamentos' });
        return;
      }

      const validationResult = medicineCreateSchema.safeParse(req.body);
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

      const medicine = await this.medicineService.create(userId, role, validationResult.data as any);
      res.status(201).json(medicine);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao cadastrar medicamento' });
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
        res.status(400).json({ error: 'ID de medicamento inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de medicamento inválido' });
          return;
        }
      }

      let isAllowed = false;
      if (role === 'ADMIN') {
        isAllowed = true;
      } else {
        if (role === 'FARMACEUTICO') {
          isAllowed = true;
        } else {
          if (role === 'ALUNO') {
            isAllowed = true;
          } else {
            isAllowed = false;
          }
        }
      }

      if (!isAllowed) {
        res.status(403).json({ error: 'Acesso negado para alteração de medicamentos' });
        return;
      }

      const medicineRecord = await prisma.medicine.findFirst({
        where: { id: id, deletedAt: null },
      });

      if (!medicineRecord) {
        res.status(404).json({ error: 'Medicamento não encontrado' });
        return;
      }

      const validationResult = medicineUpdateSchema.safeParse(req.body);
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

      const updated = await this.medicineService.update(userId, role, id, validationResult.data as any);
      res.json(updated);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao atualizar medicamento' });
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
        res.status(400).json({ error: 'ID de medicamento inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de medicamento inválido' });
          return;
        }
      }

      let isAllowed = false;
      if (role === 'ADMIN') {
        isAllowed = true;
      } else {
        if (role === 'FARMACEUTICO') {
          isAllowed = true;
        } else {
          isAllowed = false;
        }
      }

      if (!isAllowed) {
        res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem excluir medicamentos' });
        return;
      }

      const medicineRecord = await prisma.medicine.findFirst({
        where: { id: id, deletedAt: null },
      });

      if (!medicineRecord) {
        res.status(404).json({ error: 'Medicamento não encontrado' });
        return;
      }

      await this.medicineService.delete(userId, role, id);
      res.json({ message: 'Medicamento excluído com sucesso' });
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao excluir medicamento' });
        return;
      }
    }
  };
}