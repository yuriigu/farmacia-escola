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
  if (role) {
    const normalizedRole = role.toUpperCase() as AppRole;
    const permissions = rolePermissions[normalizedRole];

    if (permissions) {
      const segments = routeOrModule.replace(/^\//, '').split('?')[0].split('/');

      const routeAliases: Record<string, string> = {
        admin: 'administracao',
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