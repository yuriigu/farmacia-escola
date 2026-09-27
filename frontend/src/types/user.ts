// papeis do sistema (dominio de usuario).
// approle (importado do rbac) e a fonte canonica dos perfis
// suportados; aqui so damos um alias com nome curto pra uso
// no dominio de usuario.
import type { AppRole } from './rbac';

export type Role = AppRole;

// usuario cadastrado no sistema.
// traz os dados de conta (nome, email, papel, registeredoc),
// o perfil pessoal opcional (telefone, nascimento, endereco) e,
// quando o usuario e paciente, o resumo do cadastro de paciente
// vinculado. as permissions sao as chaves customizadas do rbac.
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

// usuario autenticado (retorno de /auth/login e /auth/me).
// e a versao "de sessao" do usuario: mais enxuta que o User
// de gestao, sem os campos que so o admin ve, mas com o
// patientid destacado (porque o token guarda isso pra filtrar
// dados do proprio paciente nas telas).
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