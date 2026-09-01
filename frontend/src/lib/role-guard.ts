// Default permissions for ALUNO role
export const DEFAULT_ALUNO_PERMISSIONS: Record<string, boolean> = {
  inventory: true,        // view inventory
  patients: true,         // view patients (read-only)
  appointments: true,     // create appointments
  batches: true,          // manage batches
  withdrawals: true,     // manage withdrawals
  disposals: true,       // manage disposals
  users: false,           // manage users
  stockManagement: true, // entry of batches
  appointmentsOverview: true, // calendar view
  scheduleSlots: false,
};

export type PermissionKey = keyof typeof DEFAULT_ALUNO_PERMISSIONS;

// Entities that map to permission keys
export const ENTITY_PERMISSION_MAP: Record<string, PermissionKey> = {
  medicines: 'inventory',
  batches: 'batches',
  withdrawals: 'withdrawals',
  disposals: 'disposals',
  patients: 'patients',
  appointments: 'appointments',
  users: 'users',
  'schedule-slots': 'scheduleSlots',
  scheduleSlots: 'scheduleSlots',
};

/**
 * Check if a user has permission for a given action.
 * - ADMIN always returns true
 * - FARMACEUTICO has all permissions except 'users'
 * - MEDICO has read-only access to dashboard, calendar, inventory, batches, withdrawals
 * - ALUNO uses their custom permissions (falls back to defaults)
 * - PACIENTE has limited read-only permissions
 */
export function isMedico(role: string): boolean {
  return role === 'MEDICO';
}

const MEDICO_PERMISSIONS: Record<string, boolean> = {
  inventory: true,
  patients: false,
  appointments: true,
  appointmentsOverview: true,
  batches: true,         // read-only (canWrite blocks)
  stockManagement: false,
  withdrawals: true,     // read-only (canWrite blocks)
  disposals: false,
  users: false,
  scheduleSlots: false,
};

export function hasPermission(
  role: string,
  permissions: Record<string, boolean> | null | undefined,
  action: PermissionKey
): boolean {
  if (role === 'ADMIN') return true;
  if (role === 'FARMACEUTICO') return action !== 'users';
  if (role === 'MEDICO') return MEDICO_PERMISSIONS[action] ?? false;
  if (role === 'PACIENTE') {
    return action === 'inventory' || action === 'appointments' || action === 'appointmentsOverview';
  }
  // ALUNO
  const perms = permissions ?? DEFAULT_ALUNO_PERMISSIONS;
  return perms[action] ?? DEFAULT_ALUNO_PERMISSIONS[action] ?? false;
}

/**
 * Check if a user can write (create/update/delete) for a given entity.
 * Used in routes to block write operations.
 */
export function canWrite(
  role: string,
  permissions: Record<string, boolean> | null | undefined,
  entity: string
): boolean {
  const permKey = ENTITY_PERMISSION_MAP[entity] ?? entity as PermissionKey;

  if (role === 'ADMIN') return true;
  if (role === 'FARMACEUTICO') return entity !== 'users';
  if (role === 'MEDICO') {
    return entity === 'appointments';
  }
  if (role === 'PACIENTE') {
    return entity === 'appointments';
  }
  // ALUNO
  return hasPermission(role, permissions, permKey);
}

/**
 * Check if role is PACIENTE
 */
export function isPatient(role: string): boolean {
  return role === 'PACIENTE';
}