import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Token não fornecido.' });
    }

    const parts = authHeader.split(' ');
    
    if (parts.length !== 2) {
      return res.status(401).json({ error: 'Token mal formatado.' });
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
      return res.status(401).json({ error: 'Token mal formatado.' });
    }

    // Verifica se JWT_SECRET está definido
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET não está definido no ambiente.');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Adiciona o usuário decodificado à requisição
    (req as any).user = decoded;

    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};