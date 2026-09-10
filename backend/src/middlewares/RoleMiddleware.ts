import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './AuthMiddleware';

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
  MEDICO: new Set<PermissionAction>(['MEDICINES_READ', 'PATIENTS_READ', 'APPOINTMENTS_READ', 'APPOINTMENTS_CREATE', 'APPOINTMENTS_CANCEL', 'PROFILE_READ', 'PROFILE_UPDATE']),
  PACIENTE: new Set<PermissionAction>(['MEDICINES_READ', 'WITHDRAWALS_READ', 'APPOINTMENTS_READ', 'APPOINTMENTS_CREATE', 'APPOINTMENTS_CANCEL', 'PROFILE_READ', 'PROFILE_UPDATE', 'MY_WITHDRAWALS_READ']),
};

function hasPermission(req: AuthenticatedRequest, permissionKey: string): boolean {
  const normalizedRole = req.user?.role?.toUpperCase();
  const action = (LEGACY_RESOURCE_ACTIONS[permissionKey] || permissionKey) as PermissionAction;
  if (normalizedRole === 'ADMIN') {
    return true;
  }
  if (ROLE_ACTIONS[normalizedRole || '']?.has(action)) {
    return true;
  }
  const permissions = req.user?.permissions;
  if (!permissions) {
    return false;
  }
  return permissions[action] === true || permissions[permissionKey] === true;
}

export function authorizeRoles(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Acesso negado para este perfil de usuário' });
      return;
    }

    next();
    return;
  };
}

export function requirePermission(permissionKey: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    if (hasPermission(req, permissionKey)) {
      next();
      return;
    }

    res.status(403).json({ error: 'Acesso negado' });
    return;
  };
}