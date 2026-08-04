import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middlewares/auth.middleware';

const authRoutes = Router();

authRoutes.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 1. Validação de campos obrigatórios
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    // 2. Busca o usuário pelo e-mail
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    // 3. Verifica se a conta está ativa
    if (!user.active) {
      return res.status(403).json({ error: 'Usuário inativo no sistema.' });
    }

    // 4. Compara a senha informada com o hash salvo no banco
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    // 5. Gera o Token JWT (válido por 1 dia)
    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      secret,
      { expiresIn: '1d' }
    );

    // 6. Remove a senha do objeto de retorno por segurança
    const { password: _, ...userWithoutPassword } = user;

    return res.json({
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

authRoutes.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = (req as Request & { user: { id: number } }).user;
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
      },
    });

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }

    return res.json(user);
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar perfil.' });
  }
});

export { authRoutes };