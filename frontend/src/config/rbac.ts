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
    'appointments',
    'estoque',
    'pacientes',
    'agendamentos',
    'calendario',
    'administracao',
    'admin',
    'configuracoes',
    'profile',
    'usuarios',
  ],
  FARMACEUTICO: [
    'dashboard',
    'medicines',
    'appointments',
    'estoque',
    'pacientes',
    'agendamentos',
    'calendario',
    'admin',
    'profile',
  ],
  MEDICO: [
    'dashboard',
    'medicines',
    'appointments',
    'agendamentos',
    'calendario',
    'profile',
  ],
  ALUNO: [
    'dashboard',
    'medicines',
    'appointments',
    'estoque',
    'admin',
    'profile',
  ],
  PACIENTE: [
    'dashboard',
    'medicines',
    'appointments',
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
  '/appointments': 'appointments',
  '/appointments/new': 'appointments',
  '/admin/stock': 'admin',
  '/estoque': 'estoque',
  '/pacientes': 'pacientes',
  '/agendamentos': 'agendamentos',
  '/calendario': 'calendario',
  '/administracao': 'administracao',
  '/configuracoes': 'configuracoes',
  '/profile': 'profile',
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
