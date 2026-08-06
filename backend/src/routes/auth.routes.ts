import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';

const authRoutes = Router();

// Rota de Registro Pública (Autocadastro de Paciente)
authRoutes.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, cpf, phone, birthDate, address } = req.body;

    // 1. Validação de campos obrigatórios
    if (!name || !email || !password || !cpf) {
      return res.status(400).json({ 
        error: 'Nome, e-mail, senha e CPF são obrigatórios.' 
      });
    }

    // 2. Verifica se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
    }

    // 3. Verifica se CPF já existe
    const existingPatient = await prisma.patient.findUnique({
      where: { cpf },
    });
    if (existingPatient) {
      return res.status(400).json({ error: 'Este CPF já está cadastrado.' });
    }

    // 4. Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Transação para criar User e Patient juntos
    const newUser = await prisma.$transaction(async (tx) => {
      // Cria o usuário
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: Role.PACIENTE,
          active: true,
        }
      });

      // Cria o paciente vinculado ao usuário
      await tx.patient.create({
        data: {
          name,
          cpf,
          phone: phone || null,
          birthDate: birthDate ? new Date(birthDate) : null,
          address: address || null,
          userId: user.id
        }
      });

      return user;
    });

    // 6. Verifica se JWT_SECRET está definido
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET não está definido no ambiente.');
    }

    // 7. Gera token JWT
    const token = jwt.sign(
      {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // 8. Busca o paciente criado
    const patient = await prisma.patient.findUnique({
      where: { id: newUser.id }
    });

    return res.status(201).json({ 
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        patientId: patient?.id || null
      }
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    return res.status(500).json({ error: 'Erro interno ao registrar paciente.' });
  }
});

// Rota de Login (já existente)
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

    // 5. Verifica se JWT_SECRET está definido
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET não está definido no ambiente.');
    }

    // 6. Gera o Token JWT (válido por 1 dia)
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // 7. Busca o patientId se o usuário for PACIENTE
    let patientId = null;
    if (user.role === Role.PACIENTE) {
      const patient = await prisma.patient.findUnique({
        where: { userId: user.id }
      });
      patientId = patient?.id || null;
    }

    // 8. Remove a senha do objeto de retorno por segurança
    const { password: _, ...userWithoutPassword } = user;

    return res.json({
      user: {
        ...userWithoutPassword,
        patientId
      },
      token,
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// Rota /me (já existente)
authRoutes.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
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

    // Busca patientId se for paciente
    let patientId = null;
    if (user.role === Role.PACIENTE) {
      const patient = await prisma.patient.findUnique({
        where: { userId: user.id }
      });
      patientId = patient?.id || null;
    }

    return res.json({ ...user, patientId });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar perfil.' });
  }
});

export { authRoutes };