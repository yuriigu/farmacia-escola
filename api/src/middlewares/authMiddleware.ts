import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { prisma } from '../utils/prisma';

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
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token de autenticação não fornecido' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, active: true, permissions: true, email: true, patient: { select: { id: true } } },
    });

    if (!user || !user.active) {
      res.status(401).json({ error: 'Usuário inativo ou inexistente' });
      return;
    }

    req.user = {
      userId: user.id,
      role: user.role,
      email: user.email,
      patientId: user.patient?.id ?? null,
      permissions: user.permissions as Record<string, boolean> | null,
    };

    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
    return;
  }
}
