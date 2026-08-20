import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

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
    // Doctor can only create appointments (handled separately in routes)
    return entity === 'appointments';
  }
  if (role === 'PACIENTE') {
    // Patient can only create appointments (handled separately in routes)
    return entity === 'appointments';
  }
  // ALUNO
  return hasPermission(role, permissions, permKey);
}

/**
 * Get user's full permission map (merges with defaults for ALUNO)
 */
export async function getUserPermissions(userId: number): Promise<Record<string, boolean>> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, permissions: true },
  });
  if (!user) return {};

  if (user.role === 'ADMIN') {
    return Object.fromEntries(Object.keys(DEFAULT_ALUNO_PERMISSIONS).map(k => [k, true]));
  }
  if (user.role === 'FARMACEUTICO') {
    const perms = { ...DEFAULT_ALUNO_PERMISSIONS };
    Object.keys(perms).forEach(k => { perms[k] = k !== 'users'; });
    return perms;
  }
  if (user.role === 'MEDICO') {
    return { ...MEDICO_PERMISSIONS };
  }
  if (user.role === 'PACIENTE') {
    const perms = { ...DEFAULT_ALUNO_PERMISSIONS };
    Object.keys(perms).forEach(k => {
      perms[k] = k === 'inventory' || k === 'appointments' || k === 'appointmentsOverview';
    });
    return perms;
  }

  // ALUNO: merge custom permissions with defaults
  const custom = (user.permissions as Record<string, boolean>) ?? {};
  return { ...DEFAULT_ALUNO_PERMISSIONS, ...custom };
}

/**
 * Require auth + check write permission. Returns 401/403 or null if ok.
 * Usage in routes: const forbidden = await requireWrite(payload, 'medicines'); if (forbidden) return forbidden;
 */
export async function requireWrite(
  payload: { userId: number; role: string },
  entity: string
): Promise<NextResponse | null> {
  const user = await db.user.findUnique({
    where: { id: payload.userId as number },
    select: { permissions: true },
  });
  if (!canWrite(payload.role, user?.permissions as Record<string, boolean> | null, entity)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

/**
 * Check if role is PACIENTE
 */
export function isPatient(role: string): boolean {
  return role === 'PACIENTE';
}
