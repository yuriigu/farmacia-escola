export type AppRole = 'ADMIN' | 'FARMACEUTICO' | 'MEDICO' | 'ALUNO' | 'PACIENTE';

export const ALL_ROLES: AppRole[] = ['ADMIN', 'FARMACEUTICO', 'MEDICO', 'ALUNO', 'PACIENTE'];

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

export function hasRouteAccess(role: string | undefined | null, routeOrModule: string): boolean {
  if (!role) return false;
  const normalizedRole = role.toUpperCase() as AppRole;
  const permissions = rolePermissions[normalizedRole];
  if (!permissions) return false;

  const segments = routeOrModule.replace(/^\//, '').split('?')[0].split('/');
  const primaryKey = segments[0] || 'dashboard';

  return permissions.includes(primaryKey);
}