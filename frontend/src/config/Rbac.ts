// DEFINICAO DOS PAPEIS DO SISTEMA
export type AppRole = 'ADMIN' | 'FARMACEUTICO' | 'MEDICO' | 'ALUNO' | 'PACIENTE';

export const ALL_ROLES: AppRole[] = ['ADMIN', 'FARMACEUTICO', 'MEDICO', 'ALUNO', 'PACIENTE'];

// MAPEAMENTO DE PERMISSOES POR PAPEL
export const rolePermissions: Record<AppRole, string[]> = {
  ADMIN: [
    'dashboard',
    'medicines',
    'estoque',
    'retiradas',
    'descartes',
    'agendamentos',
    'appointments',
    'calendario',
    'pacientes',
    'administracao',
    'admin',
    'configuracoes',
    'profile',
    'usuarios',
  ],
  FARMACEUTICO: [
    'dashboard',
    'medicines',
    'estoque',
    'retiradas',
    'descartes',
    'agendamentos',
    'appointments',
    'calendario',
    'pacientes',
    'configuracoes',
    'profile',
  ],
  MEDICO: [
    'dashboard',
    'medicines',
    'agendamentos',
    'appointments',
    'calendario',
    'configuracoes',
    'profile',
  ],
  ALUNO: [
    'dashboard',
    'medicines',
    'estoque',
    'retiradas',
    'descartes',
    'agendamentos',
    'appointments',
    'calendario',
    'pacientes',
    'configuracoes',
    'profile',
  ],
  PACIENTE: [
    'dashboard',
    'medicines',
    'agendamentos',
    'appointments',
    'configuracoes',
    'profile',
  ],
};

// FUNCAO PARA VERIFICAR SE O PAPEL TEM ACESSO A ROTA
export function hasRouteAccess(role: string | undefined | null, routeOrModule: string): boolean {
  // VERIFICANDO SE O PAPEL FOI FORNECIDO
  if (!role) {
    return false;
  }

  const normalizedRole = role.toUpperCase() as AppRole;
  const permissions = rolePermissions[normalizedRole];

  // VERIFICANDO SE O PAPEL TEM PERMISSOES CONFIGURADAS
  if (!permissions) {
    return false;
  }

  // EXTRAINDO O MODULO DA ROTA
  const segments = routeOrModule.replace(/^\//, '').split('?')[0].split('/');

  // OBTENDO O MODULO PRINCIPAL COM FALLBACK PARA DASHBOARD
  let primaryKey = 'dashboard';
  if (segments[0]) {
    primaryKey = segments[0];
  } else {
    primaryKey = 'dashboard';
  }

  // RETORNANDO SE O PAPEL POSSUI ACESSO
  const hasAccess = permissions.includes(primaryKey);
  return hasAccess;
}