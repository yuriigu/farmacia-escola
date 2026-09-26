import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { Role } from '../types/enums';

// segredo usado pra assinar e verificar os tokens jwt.
// vem da variavel de ambiente jwt_secret. se nao estiver configurada,
// derruba a aplicacao no boot: preferimos falhar cedo do que rodar
// com segredo fraco/padrao e ficar vulneravel.
const JWT_SECRET: Secret = process.env.JWT_SECRET || (() => {
  throw new Error('JWT_SECRET deve ser configurado no ambiente');
})();

// tempo de expiracao do token. padrao 7 dias. pode ser sobrescrito
// pela env jwt_expires_in (ex: '1h', '30m').
let JWT_EXPIRES_IN: SignOptions['expiresIn'] = '7d';
if (process.env.JWT_EXPIRES_IN) {
  JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN as SignOptions['expiresIn'];
}

// payload que vai dentro do token. e o que o auth-middleware le
// depois pra popular o req.user, evitando consultar o banco a cada request.
export interface TokenPayload {
  userId: number;
  role: Role;
  email?: string;
  patientId?: number | null;
}

// assina um novo token jwt com o payload informado.
// usa hs256 (hmac com sha-256) como algoritmo. o segredo vem da env.
export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });
};

// verifica e decodifica um token jwt. fixa o algoritmo em hs256
// pra evitar o ataque classico de "alg: none" (o cliente mandar
// um token sem assinatura e a biblioteca aceitar). se o token for
// invalido ou expirado, o jwt.verify lanca e quem chamou trata.
export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: ['HS256'],
  }) as TokenPayload;
};