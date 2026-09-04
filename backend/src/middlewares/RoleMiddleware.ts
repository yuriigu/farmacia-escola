import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './AuthMiddleware';

export function authorizeRoles(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Acesso negado para este perfil de usuário' });
      return;
    }

    next();
    return;
  };
}

export function requirePermission(permissionKey: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    if (req.user.role === 'ADMIN') {
      next();
      return;
    } else {
      if (req.user.role === 'FARMACEUTICO') {
        next();
        return;
      }
    }

    if (req.user.role === 'ALUNO') {
      const perms = req.user.permissions;
      if (perms) {
        if (perms[permissionKey] === true) {
          next();
          return;
        }
      }
    }

    res.status(403).json({ error: `Sem permissão de acesso ao recurso: ${permissionKey}` });
    return;
  };
}