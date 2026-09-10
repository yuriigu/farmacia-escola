import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth-middleware';

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

const LEGACY_RESOURCE_ACTIONS: Record<string, PermissionAction> = {
  medicines: 'MEDICINES_READ',
  batches: 'BATCHES_READ',
  withdrawals: 'WITHDRAWALS_READ',
  disposals: 'DISPOSALS_READ',
  patients: 'PATIENTS_READ',
  appointments: 'APPOINTMENTS_READ',
  scheduleSlots: 'SCHEDULES_READ',
  users: 'USERS_READ',
  activityLogs: 'ACTIVITY_LOGS_READ',
};

const FARMACEUTICO_ACTIONS = new Set<PermissionAction>([
  'MEDICINES_READ', 'MEDICINES_CREATE', 'MEDICINES_UPDATE', 'MEDICINES_DELETE',
  'BATCHES_READ', 'BATCHES_CREATE', 'BATCHES_UPDATE', 'BATCHES_DELETE', 'BATCHES_ADJUST',
  'WITHDRAWALS_READ', 'WITHDRAWALS_CREATE', 'WITHDRAWALS_UPDATE', 'WITHDRAWALS_CANCEL', 'WITHDRAWALS_DELETE',
  'DISPOSALS_READ', 'DISPOSALS_CREATE', 'DISPOSALS_UPDATE', 'DISPOSALS_REVERT',
  'PATIENTS_READ', 'PATIENTS_CREATE', 'PATIENTS_UPDATE', 'PATIENTS_DELETE',
  'APPOINTMENTS_READ', 'APPOINTMENTS_CREATE', 'APPOINTMENTS_UPDATE', 'APPOINTMENTS_CANCEL',
  'SCHEDULES_READ', 'SCHEDULES_CREATE', 'SCHEDULES_UPDATE', 'SCHEDULES_DELETE',
  'PROFILE_READ', 'PROFILE_UPDATE', 'MY_WITHDRAWALS_READ',
]);

const ROLE_ACTIONS: Record<string, Set<PermissionAction>> = {
  ADMIN: new Set(Object.keys(LEGACY_RESOURCE_ACTIONS).flatMap((resource) => {
    const action = LEGACY_RESOURCE_ACTIONS[resource];
    const [entity] = action.split('_');
    return [`${entity}_READ`, `${entity}_CREATE`, `${entity}_UPDATE`, `${entity}_DELETE`] as PermissionAction[];
  }).concat([
    'BATCHES_ADJUST', 'WITHDRAWALS_CANCEL', 'DISPOSALS_REVERT', 'APPOINTMENTS_CANCEL',
    'PROFILE_READ', 'PROFILE_UPDATE', 'SETTINGS_READ', 'SETTINGS_UPDATE', 'ACTIVITY_LOGS_READ', 'MY_WITHDRAWALS_READ',
  ])),
  FARMACEUTICO: FARMACEUTICO_ACTIONS,
  MEDICO: new Set<PermissionAction>(['MEDICINES_READ', 'APPOINTMENTS_READ', 'APPOINTMENTS_CREATE', 'APPOINTMENTS_CANCEL', 'PROFILE_READ', 'PROFILE_UPDATE']),
  ALUNO: new Set<PermissionAction>(['MEDICINES_READ', 'BATCHES_READ', 'WITHDRAWALS_READ', 'WITHDRAWALS_CREATE', 'WITHDRAWALS_UPDATE', 'DISPOSALS_READ', 'DISPOSALS_CREATE', 'PATIENTS_READ', 'PATIENTS_CREATE', 'PATIENTS_UPDATE', 'APPOINTMENTS_READ', 'APPOINTMENTS_CREATE', 'APPOINTMENTS_UPDATE', 'APPOINTMENTS_CANCEL', 'SCHEDULES_READ', 'PROFILE_READ', 'PROFILE_UPDATE']),
  PACIENTE: new Set<PermissionAction>(['MEDICINES_READ', 'APPOINTMENTS_READ', 'APPOINTMENTS_CREATE', 'APPOINTMENTS_CANCEL', 'PROFILE_READ', 'PROFILE_UPDATE', 'MY_WITHDRAWALS_READ', 'SCHEDULES_READ']),
};

function hasPermission(req: AuthenticatedRequest, permissionKey: string): boolean {
  let normalizedRole = '';
  if (req.user) {
    if (req.user.role) {
      normalizedRole = req.user.role.toUpperCase();
    }
  }

  let action = permissionKey as PermissionAction;
  if (LEGACY_RESOURCE_ACTIONS[permissionKey]) {
    action = LEGACY_RESOURCE_ACTIONS[permissionKey];
  }

  if (normalizedRole === 'ADMIN') {
    return true;
  }

  let roleKey = '';
  if (normalizedRole) {
    roleKey = normalizedRole;
  }

  if (ROLE_ACTIONS[roleKey]) {
    if (ROLE_ACTIONS[roleKey].has(action)) {
      return true;
    }
  }

  let permissions = undefined;
  if (req.user) {
    permissions = req.user.permissions;
  }

  if (!permissions) {
    return false;
  }

  if (permissions[action] === true) {
    return true;
  }

  if (permissions[permissionKey] === true) {
    return true;
  }

  return false;
}

export function authorizeRoles(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (req.user) {
      if (allowedRoles.includes(req.user.role)) {
        next();
      } else {
        res.status(403).json({ error: 'Acesso negado para este perfil de usuário' });
      }
    } else {
      res.status(401).json({ error: 'Não autenticado' });
    }
  };
}

export function requirePermission(permissionKey: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (req.user) {
      if (hasPermission(req, permissionKey)) {
        next();
      } else {
        res.status(403).json({ error: 'Acesso negado' });
      }
    } else {
      res.status(401).json({ error: 'Não autenticado' });
    }
  };
}