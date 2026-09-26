import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { prisma } from '../utils/prisma';
import { Role } from '../types/enums';

// tipo do request ja autenticado. estende o Request do express
// pra carregar o usuario resolvido a partir do token (payload do jwt
// mais as permissoes customizadas, quando existirem).
export interface AuthenticatedRequest extends Request {
  user?: TokenPayload & { permissions?: Record<string, boolean> | null };
}

// middleware de autenticacao. roda antes das rotas protegidas pra:
// 1) checar se veio o header Authorization no formato Bearer
// 2) validar o token (assinatura e expiracao) via /utils/jwt.ts
// 3) buscar o usuario no banco pra confirmar que existe e esta ativo
// 4) injetar o usuario resolvido em req.user, pra que os controllers
//    tenham acesso a userId, role, patientId e permissions sem
//    precisar consultar o banco de novo.
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // le o header Authorization. sem ele, nem vale tentar autenticar.
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'Token de autenticação não fornecido' });
      return;
    } else {
      // so aceitamos o padrao Bearer <token>. qualquer outro esquema
      // e tratado como token ausente.
      if (!authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Token de autenticação não fornecido' });
        return;
      }
    }

    // pega so a parte do token (depois do espaco) e valida no jwt.
    // se a assinatura ou a expiracao estiverem ruins, verifyToken lanca
    // e a gente cai no catch la embaixo, devolvendo 401.
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    // busca o usuario no banco (/utils/prisma.ts) pra confirmar que
    // ele ainda existe, esta ativo e pra pegar os campos frescos:
    // role, permissions e o patientId (quando for paciente).
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, active: true, permissions: true, email: true, patient: { select: { id: true } } },
    });

    if (!user) {
      res.status(401).json({ error: 'Usuário inativo ou inexistente' });
      return;
    } else {
      // usuario desativado tambem e tratado como inexistente,
      // pra nao dar pista de que a conta existe.
      if (!user.active) {
        res.status(401).json({ error: 'Usuário inativo ou inexistente' });
        return;
      }
    }

    // se o usuario for paciente, guardamos o id do cadastro dele.
    // isso e usado pelos controllers pra filtrar dados e autorizar
    // acesso sem precisar bater no banco de novo.
    let patientId: number | null = null;
    if (user.patient) {
      patientId = user.patient.id;
    } else {
      patientId = null;
    }

    // as permissoes chegam do banco como string json (ou null).
    // aqui convertemos pra objeto, tolerando falha de parse
    // pra nao derrubar a autenticacao por causa disso.
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

    // injeta o usuario resolvido no request. a partir daqui os controllers
    // podem confiar em req.user sem refazer consulta no banco.
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
    // qualquer erro aqui (token invalido, expirado, malformado)
    // cai como 401 generico, sem vazar detalhes pro cliente.
    res.status(401).json({ error: 'Token inválido ou expirado' });
    return;
  }
}