import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { Role } from '../types/Enums';

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'farmacia-escola-secret-key';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

export interface TokenPayload {
  userId: number;
  role: Role;
  email?: string;
  patientId?: number | null;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};