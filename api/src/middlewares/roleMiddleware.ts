import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';

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
  };
}

export function requirePermission(permissionKey: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    if (req.user.role === 'ADMIN' || req.user.role === 'FARMACEUTICO') {
      return next();
    }

    if (req.user.role === 'ALUNO') {
      const perms = req.user.permissions;
      if (perms && perms[permissionKey] === true) {
        return next();
      }
    }

    res.status(403).json({ error: `Sem permissão de acesso ao recurso: ${permissionKey}` });
  };
}
