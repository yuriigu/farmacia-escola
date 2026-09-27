'use client';

import { useAuthStore } from '@/lib/auth-store';
import { canWriteClient, checkPermission, type PermissionKey } from '@/lib/constants';
import type { PermissionAction } from '@/types';

// de-para entre acao fine-grained (ex: medicines_create) e a
// chave de recurso usada pelas funcoes de checagem do client
// (ex: inventory, batches, disposals). a ideia e reaproveitar
// a logica ja existente em constants, so que reagrupada por
// recurso. a ausencia de uma acao aqui faz o haspermission
// devolver false (nega por padrao).
const ACTION_TO_PERMISSION: Partial<Record<PermissionAction, PermissionKey>> = {
  MEDICINES_READ: 'inventory', MEDICINES_CREATE: 'inventory', MEDICINES_UPDATE: 'inventory', MEDICINES_DELETE: 'inventory',
  BATCHES_READ: 'batches', BATCHES_CREATE: 'batches', BATCHES_UPDATE: 'batches', BATCHES_DELETE: 'batches', BATCHES_ADJUST: 'batches',
  DISPOSALS_READ: 'disposals', DISPOSALS_CREATE: 'disposals', DISPOSALS_UPDATE: 'disposals', DISPOSALS_REVERT: 'disposals',
  PATIENTS_READ: 'patients', PATIENTS_CREATE: 'patients', PATIENTS_UPDATE: 'patients', PATIENTS_DELETE: 'patients',
  APPOINTMENTS_READ: 'appointments', APPOINTMENTS_CREATE: 'appointments', APPOINTMENTS_UPDATE: 'appointments', APPOINTMENTS_CANCEL: 'appointments', APPOINTMENTS_DELETE: 'appointments',
  SCHEDULES_READ: 'scheduleSlots', SCHEDULES_CREATE: 'scheduleSlots', SCHEDULES_UPDATE: 'scheduleSlots', SCHEDULES_DELETE: 'scheduleSlots',
  USERS_READ: 'users', USERS_CREATE: 'users', USERS_UPDATE: 'users', USERS_DELETE: 'users',
};

// conjunto das acoes que sao de "escrita" (create/update/delete/
// cancel/revert/adjust). essas passam pela checagem mais estrita
// do canwriteclient, que tambem considera a flag de escrita do
// recurso. as acoes de leitura usam checkpermission, que so olha
// a permissao basica do recurso.
const WRITE_ACTIONS = new Set<PermissionAction>([
  'MEDICINES_CREATE', 'MEDICINES_UPDATE', 'MEDICINES_DELETE', 'BATCHES_CREATE', 'BATCHES_UPDATE', 'BATCHES_DELETE', 'BATCHES_ADJUST',
  'DISPOSALS_CREATE', 'DISPOSALS_UPDATE', 'DISPOSALS_REVERT',
  'PATIENTS_CREATE', 'PATIENTS_UPDATE', 'PATIENTS_DELETE', 'APPOINTMENTS_CREATE', 'APPOINTMENTS_UPDATE', 'APPOINTMENTS_CANCEL', 'APPOINTMENTS_DELETE',
  'SCHEDULES_CREATE', 'SCHEDULES_UPDATE', 'SCHEDULES_DELETE', 'USERS_CREATE', 'USERS_UPDATE', 'USERS_DELETE', 'PROFILE_UPDATE', 'SETTINGS_UPDATE',
]);

// checagem central de permissao no client. ordem das decisoes:
// 1) sem papel -> false
// 2) admin -> true (passa em tudo)
// 3) profile_read/profile_update -> true (todo usuario edita o
//    proprio perfil)
// 4) settings_read/settings_update -> false (por enquanto so admin,
//    que ja foi liberado no passo 2)
// 5) demais acoes -> resolve a chave de recurso e delega:
//    - acoes de escrita vao pro canwriteclient
//    - acoes de leitura vao pro checkpermission
// qualquer acao fora do de-para tambem cai em false.
export function hasPermission(action: PermissionAction, role?: string | null, permissions?: Record<string, boolean> | null): boolean {
  let normalizedRole = '';
  if (role) {
    normalizedRole = role.toUpperCase();
  }

  // sem papel, nega. evita acao sem contexto de usuario.
  if (normalizedRole) {
    if (normalizedRole === 'ADMIN') {
      return true;
    }
  } else {
    return false;
  }

  // profile e universal: qualquer usuario logado edita o proprio.
  if (action === 'PROFILE_READ') {
    return true;
  }
  if (action === 'PROFILE_UPDATE') {
    return true;
  }

  // settings continua restrito (admin ja passou antes).
  if (action === 'SETTINGS_READ') {
    return false;
  }
  if (action === 'SETTINGS_UPDATE') {
    return false;
  }

  // resolve a chave de recurso pro de-para e delega pra checagem
  // certa, dependendo se a acao e de escrita ou leitura.
  const permissionKey = ACTION_TO_PERMISSION[action];
  if (permissionKey) {
    if (WRITE_ACTIONS.has(action)) {
      // scheduleSlots precisa virar "schedule-slots" (com hifen)
      // pra bater com a chave usada pelo canwriteclient.
      return canWriteClient(normalizedRole, permissions, permissionKey.replace('scheduleSlots', 'schedule-slots'));
    } else {
      return checkPermission(normalizedRole, permissions, permissionKey);
    }
  } else {
    return false;
  }
}

// hook que liga o haspermission ao estado de auth da store. le o
// papel e as permissoes do usuario logado e devolve o boolean
// pronto pra usar em render (ex: {haspermission('users_create') && <botao />}).
// sem usuario logado, passa undefined pro haspermission, que cai
// na regra de "sem papel -> false".
export function usePermission(action: PermissionAction): boolean {
  const user = useAuthStore((state) => state.user);
  let userRole: string | null = null;
  if (user) {
    userRole = user.role;
  }
  let userPerms: Record<string, boolean> | null = null;
  if (user) {
    if (user.permissions) {
      userPerms = user.permissions;
    }
  }
  return hasPermission(action, userRole, userPerms);
}