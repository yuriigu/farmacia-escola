import { Request, Response, NextFunction } from 'express';

type Role = 'ADMIN' | 'FARMACEUTICO' | 'ALUNO' | 'PACIENTE';

export function roleMiddleware(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    
    if (!allowedRoles.includes(user.role as Role)) {
      return res.status(403).json({ error: 'Acesso negado: privilégios insuficientes' });
    }
    
    next();
  };
}