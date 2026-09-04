import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/Jwt';
import { prisma } from '../utils/Prisma';
import { Role } from '../types/Enums';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload & { permissions?: Record<string, boolean> | null };
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Token de autenticação não fornecido' });
      return;
    } else {
      if (!authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Token de autenticação não fornecido' });
        return;
      }
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, active: true, permissions: true, email: true, patient: { select: { id: true } } },
    });

    if (!user) {
      res.status(401).json({ error: 'Usuário inativo ou inexistente' });
      return;
    } else {
      if (!user.active) {
        res.status(401).json({ error: 'Usuário inativo ou inexistente' });
        return;
      }
    }

    let patientId: number | null = null;
    if (user.patient) {
      patientId = user.patient.id;
    } else {
      patientId = null;
    }

    req.user = {
      userId: user.id,
      role: user.role as Role,
      email: user.email,
      patientId: patientId,
      permissions: user.permissions as Record<string, boolean> | null,
    };

    next();
    return;
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
    return;
  }
}