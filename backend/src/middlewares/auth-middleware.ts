import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { prisma } from '../utils/prisma';
import { Role } from '../types/enums';

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

    let parsedPermissions: Record<string, boolean> | null = null;
    if (user.permissions) {
      if (typeof user.permissions === 'string') {
        try {
          parsedPermissions = JSON.parse(user.permissions) as Record<string, boolean>;
        } catch {
          parsedPermissions = null;
        }
      } else {
        parsedPermissions = user.permissions as unknown as Record<string, boolean>;
      }
    }

    req.user = {
      userId: user.id,
      role: user.role as Role,
      email: user.email,
      patientId: patientId,
      permissions: parsedPermissions,
    };

    next();
    return;
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
    return;
  }
}