import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/AuthMiddleware';
import { UserService } from '../services/UserService';
import { prisma } from '../utils/Prisma';
import {
  userCreateSchema,
  userUpdateSchema,
  userToggleActiveSchema,
} from '../middlewares/ValidationMiddleware';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  getAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const role = req.user.role;

      if (role !== 'ADMIN') {
        res.status(403).json({ error: 'Apenas administradores podem listar usuários do sistema' });
        return;
      }

      const users = await this.userService.getAllUsers();
      res.json(users);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar usuários' });
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
        res.status(400).json({ error: 'ID de usuário inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de usuário inválido' });
          return;
        }
      }

      if (role !== 'ADMIN') {
        if (id !== userId) {
          res.status(403).json({ error: 'Acesso não autorizado aos dados de outro usuário' });
          return;
        }
      }

      const user = await this.userService.getUserById(id);
      res.json(user);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao buscar usuário' });
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
      const adminId = req.user.userId;
      const role = req.user.role;

      if (role !== 'ADMIN') {
        res.status(403).json({ error: 'Apenas administradores podem cadastrar novos colaboradores' });
        return;
      }

      const validationResult = userCreateSchema.safeParse(req.body);
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

      const user = await this.userService.createUser(adminId, validationResult.data as any);
      res.status(201).json(user);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao cadastrar usuário' });
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
      const adminId = req.user.userId;
      const role = req.user.role;
      const id = Number(req.params.id);

      if (!id) {
        res.status(400).json({ error: 'ID de usuário inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de usuário inválido' });
          return;
        }
      }

      const userRecord = await prisma.user.findUnique({
        where: { id: id },
      });

      if (!userRecord) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }

      if (role !== 'ADMIN') {
        if (id !== adminId) {
          res.status(403).json({ error: 'Acesso não autorizado para modificar outro usuário' });
          return;
        }
      }

      const validationResult = userUpdateSchema.safeParse(req.body);
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
      if (role !== 'ADMIN') {
        delete payload.role;
        delete payload.permissions;
      }

      const updated = await this.userService.updateUser(adminId, id, payload as any);
      res.json(updated);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
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
      const adminId = req.user.userId;
      const role = req.user.role;
      const id = Number(req.params.id);

      if (!id) {
        res.status(400).json({ error: 'ID de usuário inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de usuário inválido' });
          return;
        }
      }

      if (role !== 'ADMIN') {
        res.status(403).json({ error: 'Apenas administradores podem excluir usuários' });
        return;
      }

      if (id === adminId) {
        res.status(400).json({ error: 'Não é permitido excluir sua própria conta de administrador' });
        return;
      }

      const userRecord = await prisma.user.findUnique({
        where: { id: id },
      });

      if (!userRecord) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }

      const result = await this.userService.deleteUser(adminId, id);
      res.json(result);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao excluir usuário' });
        return;
      }
    }
  };

  toggleActive = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      const adminId = req.user.userId;
      const role = req.user.role;
      const id = Number(req.params.id);

      if (!id) {
        res.status(400).json({ error: 'ID de usuário inválido' });
        return;
      } else {
        if (isNaN(id)) {
          res.status(400).json({ error: 'ID de usuário inválido' });
          return;
        }
      }

      if (role !== 'ADMIN') {
        res.status(403).json({ error: 'Apenas administradores podem ativar ou desativar usuários' });
        return;
      }

      if (id === adminId) {
        res.status(400).json({ error: 'Não é permitido desativar sua própria conta de administrador' });
        return;
      }

      const userRecord = await prisma.user.findUnique({
        where: { id: id },
      });

      if (!userRecord) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }

      const validationResult = userToggleActiveSchema.safeParse(req.body);
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

      const updated = await this.userService.toggleActive(adminId, id, validationResult.data.active);
      res.json(updated);
      return;
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      } else {
        res.status(500).json({ error: 'Erro ao alterar status do usuário' });
        return;
      }
    }
  };
}