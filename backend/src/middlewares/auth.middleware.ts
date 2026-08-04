import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface TokenPayload {
  id: number;
  name: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }

  const token = authorization.replace('Bearer', '').trim();

  try {
    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const decoded = jwt.verify(token, secret) as TokenPayload;

    // Injeta os dados do usuário na requisição
    (req as Request & { user: TokenPayload }).user = decoded;

    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}