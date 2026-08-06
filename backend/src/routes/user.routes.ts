import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { Role } from '@prisma/client';

const userRoutes = Router();

// Todas as rotas de usuário exigem autenticação + perfil ADMIN
userRoutes.use(authMiddleware);
userRoutes.use(roleMiddleware(['ADMIN']));

// Campos retornados ao cliente (nunca a senha)
const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  registerDoc: true,
  phone: true,
  active: true,
  createdAt: true,
} as const;

// GET /users - Listar usuários (apenas ADMIN)
userRoutes.get('/', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: userSelect,
      orderBy: { name: 'asc' },
    });
    return res.json(users);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return res.status(500).json({ error: 'Erro interno ao listar usuários.' });
  }
});

// GET /users/:id - Detalhar usuário (apenas ADMIN)
userRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: userSelect,
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    return res.json(user);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar usuário.' });
  }
});

// POST /users - Criar farmacêutico/aluno (apenas ADMIN)
userRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, registerDoc, phone } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        error: 'Nome, e-mail, senha e perfil são obrigatórios.',
      });
    }

    if (!Object.values(Role).includes(role)) {
      return res.status(400).json({ error: 'Perfil (role) inválido.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Já existe um usuário com este e-mail.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        registerDoc: registerDoc || null,
        phone: phone || null,
      },
      select: userSelect,
    });

    return res.status(201).json(user);
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return res.status(500).json({ error: 'Erro interno ao criar usuário.' });
  }
});

// PUT /users/:id - Atualizar role, ativo/inativo, dados e senha opcional (apenas ADMIN)
userRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, role, registerDoc, phone, active, password } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { id: Number(id) },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (role !== undefined) {
      if (!Object.values(Role).includes(role)) {
        return res.status(400).json({ error: 'Perfil (role) inválido.' });
      }
      data.role = role;
    }
    if (registerDoc !== undefined) data.registerDoc = registerDoc;
    if (phone !== undefined) data.phone = phone;
    if (active !== undefined) data.active = Boolean(active);
    if (password) data.password = await bcrypt.hash(String(password), 10);

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data,
      select: userSelect,
    });

    return res.json(updatedUser);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return res.status(500).json({ error: 'Erro interno ao atualizar usuário.' });
  }
});

// DELETE /users/:id - Desativar usuário (soft delete, active=false) (apenas ADMIN)
userRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const authUser = (req as Request & { user: { id: number } }).user;

    // Não permitir desativar o próprio usuário
    if (Number(authUser.id) === Number(id)) {
      return res.status(400).json({ error: 'Você não pode desativar seu próprio usuário.' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: Number(id) },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: { active: false },
      select: userSelect,
    });

    return res.json({ ...updatedUser, message: 'Usuário desativado com sucesso.' });
  } catch (error) {
    console.error('Erro ao desativar usuário:', error);
    return res.status(500).json({ error: 'Erro interno ao desativar usuário.' });
  }
});

export { userRoutes };
