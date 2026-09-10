'use client';

import { ReactNode } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { canWriteClient, checkPermission, type PermissionKey } from '@/lib/constants';

export type PermissionAction =
  | 'MEDICINES_READ' | 'MEDICINES_CREATE' | 'MEDICINES_UPDATE' | 'MEDICINES_DELETE'
  | 'BATCHES_READ' | 'BATCHES_CREATE' | 'BATCHES_UPDATE' | 'BATCHES_DELETE' | 'BATCHES_ADJUST'
  | 'WITHDRAWALS_READ' | 'WITHDRAWALS_CREATE' | 'WITHDRAWALS_UPDATE' | 'WITHDRAWALS_CANCEL' | 'WITHDRAWALS_DELETE'
  | 'DISPOSALS_READ' | 'DISPOSALS_CREATE' | 'DISPOSALS_UPDATE' | 'DISPOSALS_REVERT'
  | 'PATIENTS_READ' | 'PATIENTS_CREATE' | 'PATIENTS_UPDATE' | 'PATIENTS_DELETE'
  | 'APPOINTMENTS_READ' | 'APPOINTMENTS_CREATE' | 'APPOINTMENTS_UPDATE' | 'APPOINTMENTS_CANCEL' | 'APPOINTMENTS_DELETE'
  | 'SCHEDULES_READ' | 'SCHEDULES_CREATE' | 'SCHEDULES_UPDATE' | 'SCHEDULES_DELETE'
  | 'USERS_READ' | 'USERS_CREATE' | 'USERS_UPDATE' | 'USERS_DELETE'
  | 'ACTIVITY_LOGS_READ' | 'PROFILE_READ' | 'PROFILE_UPDATE' | 'SETTINGS_READ' | 'SETTINGS_UPDATE'
  | 'MY_WITHDRAWALS_READ';

const ACTION_TO_PERMISSION: Partial<Record<PermissionAction, PermissionKey>> = {
  MEDICINES_READ: 'inventory', MEDICINES_CREATE: 'inventory', MEDICINES_UPDATE: 'inventory', MEDICINES_DELETE: 'inventory',
  BATCHES_READ: 'batches', BATCHES_CREATE: 'batches', BATCHES_UPDATE: 'batches', BATCHES_DELETE: 'batches', BATCHES_ADJUST: 'batches',
  WITHDRAWALS_READ: 'withdrawals', WITHDRAWALS_CREATE: 'withdrawals', WITHDRAWALS_UPDATE: 'withdrawals', WITHDRAWALS_CANCEL: 'withdrawals', WITHDRAWALS_DELETE: 'withdrawals',
  DISPOSALS_READ: 'disposals', DISPOSALS_CREATE: 'disposals', DISPOSALS_UPDATE: 'disposals', DISPOSALS_REVERT: 'disposals',
  PATIENTS_READ: 'patients', PATIENTS_CREATE: 'patients', PATIENTS_UPDATE: 'patients', PATIENTS_DELETE: 'patients',
  APPOINTMENTS_READ: 'appointments', APPOINTMENTS_CREATE: 'appointments', APPOINTMENTS_UPDATE: 'appointments', APPOINTMENTS_CANCEL: 'appointments', APPOINTMENTS_DELETE: 'appointments',
  SCHEDULES_READ: 'scheduleSlots', SCHEDULES_CREATE: 'scheduleSlots', SCHEDULES_UPDATE: 'scheduleSlots', SCHEDULES_DELETE: 'scheduleSlots',
  USERS_READ: 'users', USERS_CREATE: 'users', USERS_UPDATE: 'users', USERS_DELETE: 'users',
};

const WRITE_ACTIONS = new Set<PermissionAction>([
  'MEDICINES_CREATE', 'MEDICINES_UPDATE', 'MEDICINES_DELETE', 'BATCHES_CREATE', 'BATCHES_UPDATE', 'BATCHES_DELETE', 'BATCHES_ADJUST',
  'WITHDRAWALS_CREATE', 'WITHDRAWALS_UPDATE', 'WITHDRAWALS_CANCEL', 'WITHDRAWALS_DELETE', 'DISPOSALS_CREATE', 'DISPOSALS_UPDATE', 'DISPOSALS_REVERT',
  'PATIENTS_CREATE', 'PATIENTS_UPDATE', 'PATIENTS_DELETE', 'APPOINTMENTS_CREATE', 'APPOINTMENTS_UPDATE', 'APPOINTMENTS_CANCEL', 'APPOINTMENTS_DELETE',
  'SCHEDULES_CREATE', 'SCHEDULES_UPDATE', 'SCHEDULES_DELETE', 'USERS_CREATE', 'USERS_UPDATE', 'USERS_DELETE', 'PROFILE_UPDATE', 'SETTINGS_UPDATE',
]);

export function hasPermission(action: PermissionAction, role?: string | null, permissions?: Record<string, boolean> | null): boolean {
  let normalizedRole = '';
  if (role) {
    normalizedRole = role.toUpperCase();
  }

  if (normalizedRole) {
    if (normalizedRole === 'ADMIN') {
      return true;
    }
  } else {
    return false;
  }

  if (action === 'PROFILE_READ') {
    return true;
  }
  if (action === 'PROFILE_UPDATE') {
    return true;
  }

  if (action === 'MY_WITHDRAWALS_READ') {
    if (normalizedRole === 'PACIENTE') {
      return true;
    } else {
      return false;
    }
  }

  if (action === 'SETTINGS_READ') {
    return false;
  }
  if (action === 'SETTINGS_UPDATE') {
    return false;
  }

  const permissionKey = ACTION_TO_PERMISSION[action];
  if (permissionKey) {
    if (WRITE_ACTIONS.has(action)) {
      return canWriteClient(normalizedRole, permissions, permissionKey.replace('scheduleSlots', 'schedule-slots'));
    } else {
      return checkPermission(normalizedRole, permissions, permissionKey);
    }
  } else {
    return false;
  }
}

export function usePermission(action: PermissionAction): boolean {
  const user = useAuthStore((state) => state.user);
  let userRole = null;
  if (user) {
    userRole = user.role;
  }
  let userPerms = null;
  if (user) {
    if (user.permissions) {
      userPerms = user.permissions;
    }
  }
  return hasPermission(action, userRole, userPerms);
}

export function Can({ permission, children }: { permission: PermissionAction; children: ReactNode }) {
  const authorized = usePermission(permission);
  if (authorized) {
    return children as any;
  } else {
    return null;
  }
}
