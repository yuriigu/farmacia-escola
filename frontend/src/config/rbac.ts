export type AppRole = 'ADMIN' | 'FARMACEUTICO' | 'MEDICO' | 'ALUNO' | 'PACIENTE';

export const ALL_ROLES: AppRole[] = ['ADMIN', 'FARMACEUTICO', 'MEDICO', 'ALUNO', 'PACIENTE'];

/**
 * RBAC Permission mapping per role.
 * Lists the permitted module keys / route segments for each role.
 */
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

/**
 * Explicit route path mapping to permission keys.
 */
export const ROUTE_PERMISSION_MAP: Record<string, string> = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/medicines': 'medicines',
  '/estoque': 'estoque',
  '/retiradas': 'retiradas',
  '/descartes': 'descartes',
  '/agendamentos': 'agendamentos',
  '/appointments': 'agendamentos',
  '/appointments/new': 'agendamentos',
  '/calendario': 'calendario',
  '/pacientes': 'pacientes',
  '/administracao': 'administracao',
  '/admin': 'administracao',
  '/configuracoes': 'configuracoes',
  '/profile': 'configuracoes',
};

/**
 * Returns whether a given user role is authorized to access a specified route or module.
 */
export function hasRouteAccess(role: string | undefined | null, routeOrModule: string): boolean {
  if (!role) return false;
  const normalizedRole = role.toUpperCase() as AppRole;
  const permissions = rolePermissions[normalizedRole];
  if (!permissions) return false;

  // Clean route parameter (e.g. /admin/stock -> admin)
  const segments = routeOrModule.replace(/^\//, '').split('?')[0].split('/');
  const primaryKey = segments[0] || 'dashboard';

  return permissions.includes(primaryKey);
}

/**
 * Returns the list of roles allowed to access a specific route or module.
 */
export function getAllowedRolesForRoute(routeOrModule: string): AppRole[] {
  const segments = routeOrModule.replace(/^\//, '').split('?')[0].split('/');
  const primaryKey = segments[0] || 'dashboard';
  return ALL_ROLES.filter((role) => rolePermissions[role]?.includes(primaryKey));
}