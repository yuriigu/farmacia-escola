// DEFINICAO DOS PAPEIS DO SISTEMA (DOMINIO DE USUARIO)
// AppRole e a fonte canonica; Role estende com papeis legados.
import type { AppRole } from './rbac';

export type Role = AppRole | 'ATENDENTE';

// USUARIO CADASTRADO NO SISTEMA
export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  registerDoc?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  address?: string | null;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  permissions?: Record<string, boolean> | null;
  patient?: {
    id?: number;
    cpf?: string | null;
    birthDate?: string | null;
    address?: string | null;
    phone?: string | null;
  } | null;
}

// USUARIO AUTENTICADO (RETORNO DE /AUTH/LOGIN E /AUTH/ME)
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  active?: boolean;
  phone?: string | null;
  registerDoc?: string | null;
  patientId?: number | null;
  permissions?: Record<string, boolean>;
}