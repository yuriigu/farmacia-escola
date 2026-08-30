import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { UserService } from '../services/UserService';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  getAll = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const users = await this.userService.getAllUsers();
      res.json(users);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao buscar usuários' });
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const user = await this.userService.getUserById(id);
      res.json(user);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao buscar usuário' });
    }
  };

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const adminId = req.user!.userId;
      const user = await this.userService.createUser(adminId, req.body);
      res.status(201).json(user);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao cadastrar usuário' });
    }
  };

  update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const adminId = req.user!.userId;
      const id = Number(req.params.id);
      const updated = await this.userService.updateUser(adminId, id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao atualizar usuário' });
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const adminId = req.user!.userId;
      const id = Number(req.params.id);
      const result = await this.userService.deleteUser(adminId, id);
      res.json(result);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao excluir usuário' });
    }
  };

  toggleActive = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const adminId = req.user!.userId;
      const id = Number(req.params.id);
      const { active } = req.body;
      const updated = await this.userService.toggleActive(adminId, id, active);
      res.json(updated);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Erro ao alterar status do usuário' });
    }
  };
}