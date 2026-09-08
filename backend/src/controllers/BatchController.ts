import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/AuthMiddleware';
import { BatchService } from '../services/BatchService';
import { prisma } from '../utils/Prisma';
import { batchCreateSchema, batchUpdateSchema } from '../middlewares/ValidationMiddleware';

export class BatchController {
  private batchService: BatchService;

  constructor() {
    this.batchService = new BatchService();
  }

  getAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      let medicineId = undefined;
      if (req.query.medicineId) {
        medicineId = Number(req.query.medicineId);
      } else {
        medicineId = undefined;
      }
      const batches = await this.batchService.getAll(medicineId);
      res.json(batches);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar lotes' });
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
        res.status(400).json({ error: 'ID de lote inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de lote inválido' });
          return;
        }
      }

      const batchRecord = await prisma.stockBatch.findUnique({
        where: { id: id },
      });

      if (!batchRecord) {
        res.status(404).json({ error: 'Lote não encontrado' });
        return;
      }

      const batch = await this.batchService.getById(id);
      res.json(batch);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar lote' });
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
        res.status(403).json({ error: 'Acesso negado para criação de lotes' });
        return;
      }

      const validationResult = batchCreateSchema.safeParse(req.body);
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

      const medicineRecord = await prisma.medicine.findUnique({
        where: { id: validationResult.data.medicineId },
      });

      if (!medicineRecord) {
        res.status(404).json({ error: 'Medicamento não encontrado' });
        return;
      }

      const batch = await this.batchService.create(userId, role, validationResult.data as any);
      res.status(201).json(batch);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao cadastrar lote' });
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
        res.status(400).json({ error: 'ID de lote inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de lote inválido' });
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
        res.status(403).json({ error: 'Acesso negado para alteração de lotes' });
        return;
      }

      const batchRecord = await prisma.stockBatch.findUnique({
        where: { id: id },
      });

      if (!batchRecord) {
        res.status(404).json({ error: 'Lote não encontrado' });
        return;
      }

      const validationResult = batchUpdateSchema.safeParse(req.body);
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

      const updated = await this.batchService.update(userId, role, id, validationResult.data as any);
      res.json(updated);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao atualizar lote' });
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
        res.status(400).json({ error: 'ID de lote inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de lote inválido' });
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
        res.status(403).json({ error: 'Apenas administradores e farmacêuticos podem excluir lotes' });
        return;
      }

      const batchRecord = await prisma.stockBatch.findUnique({
        where: { id: id },
      });

      if (!batchRecord) {
        res.status(404).json({ error: 'Lote não encontrado' });
        return;
      }

      const result = await this.batchService.delete(userId, role, id);
      res.json(result);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao excluir lote' });
        return;
      }
    }
  };
}