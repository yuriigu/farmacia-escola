// DEFINICAO DOS PAPEIS DO SISTEMA
export type AppRole = 'ADMIN' | 'FARMACEUTICO' | 'MEDICO' | 'ALUNO' | 'PACIENTE';

export const ALL_ROLES: AppRole[] = ['ADMIN', 'FARMACEUTICO', 'MEDICO', 'ALUNO', 'PACIENTE'];

export const FARMACY_STAFF_ROLES: AppRole[] = ['FARMACEUTICO', 'ALUNO'];

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
    'configuracoes',
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
    'administracao',
    'admin',
    'profile',
    'configuracoes',
    'settings',
    'usuarios',
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
    'scales',
    'pacientes',
    'administracao',
    'admin',
    'profile',
    'configuracoes',
    'settings',
    'usuarios',
  ],
  MEDICO: [
    'dashboard',
    'medicines',
    'agendamentos',
    'appointments',
    'calendario',
    'pacientes',
    'administracao',
    'admin',
    'profile',
    'configuracoes',
    'settings',
    'usuarios',
  ],
  PACIENTE: [
    'dashboard',
    'medicines',
    'agendamentos',
    'appointments',
    'retiradas',
    'profile',
    'configuracoes',
    'settings',
  ],
};

// FUNCAO PARA VERIFICAR SE O PAPEL TEM ACESSO A ROTA
export function hasRouteAccess(role: string | undefined | null, routeOrModule: string): boolean {
  if (role) {
    const normalizedRole = role.toUpperCase() as AppRole;
    const permissions = rolePermissions[normalizedRole];

    if (permissions) {
      const segments = routeOrModule.replace(/^\//, '').split('?')[0].split('/');

      const routeAliases: Record<string, string> = {
        admin: 'administracao',
        usuarios: 'administracao',
        calendario: 'calendario',
        profile: 'configuracoes',
        configuracoes: 'profile',
        appointments: 'appointments',
        agendamentos: 'agendamentos',
      };
      let primarySegment = 'dashboard';
      if (segments[0]) {
        primarySegment = segments[0];
      } else {
        primarySegment = 'dashboard';
      }
      let primaryKey = primarySegment;
      if (routeAliases[primarySegment]) {
        primaryKey = routeAliases[primarySegment];
      } else {
        primaryKey = primarySegment;
      }

      const hasAccess = permissions.includes(primaryKey);
      return hasAccess;
    } else {
      return false;
    }
  } else {
    return false;
  }
}