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
    'scales',
    'pacientes',
    'administracao',
    'admin',
    'profile',
    'settings',
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
    'scales',
    'pacientes',
    'profile',
  ],
  MEDICO: [
    'dashboard',
    'medicines',
    'agendamentos',
    'appointments',
    'calendario',
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
    'profile',
  ],
  PACIENTE: [
    'dashboard',
    'medicines',
    'agendamentos',
    'appointments',
    'profile',
    'my-appointments',
    'my-withdrawals',
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
  const routeAliases: Record<string, string> = {
    admin: 'administracao',
    calendario: 'calendario',
    profile: 'configuracoes',
    configuracoes: 'profile',
    appointments: 'appointments',
    agendamentos: 'agendamentos',
  };
  const primarySegment = segments[0] || 'dashboard';
  const primaryKey = routeAliases[primarySegment] || primarySegment;

  // RETORNANDO SE O PAPEL POSSUI ACESSO
  const hasAccess = permissions.includes(primaryKey);
  return hasAccess;
}