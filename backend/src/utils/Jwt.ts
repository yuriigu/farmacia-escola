import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { Role } from '../types/Enums';

let JWT_SECRET: Secret = 'farmacia-escola-secret-key';
if (process.env.JWT_SECRET) {
  JWT_SECRET = process.env.JWT_SECRET;
} else {
  JWT_SECRET = 'farmacia-escola-secret-key';
}

let JWT_EXPIRES_IN: SignOptions['expiresIn'] = '7d';
if (process.env.JWT_EXPIRES_IN) {
  JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN as SignOptions['expiresIn'];
} else {
  JWT_EXPIRES_IN = '7d';
}

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