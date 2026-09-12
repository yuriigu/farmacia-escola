import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { Role } from '../types/enums';

const JWT_SECRET: Secret = process.env.JWT_SECRET || (() => {
  throw new Error('JWT_SECRET deve ser configurado no ambiente');
})();

let JWT_EXPIRES_IN: SignOptions['expiresIn'] = '7d';
if (process.env.JWT_EXPIRES_IN) {
  JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN as SignOptions['expiresIn'];
}

export interface TokenPayload {
  userId: number;
  role: Role;
  email?: string;
  patientId?: number | null;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: ['HS256'],
  }) as TokenPayload;
};