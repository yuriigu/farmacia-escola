import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth-middleware';

// catalogo de acoes de permissao do sistema. cada acao segue o padrao
// RECURSO_VERBO (ex: MEDICINES_CREATE, BATCHES_ADJUST) e e o que as
// rotas checam pra liberar ou bloquear o acesso.
// funciona como fonte da verdade: se uma acao nova entrar, ela precisa
// aparecer aqui e ser distribida nos papeis abaixo.
export type PermissionAction =
  | 'MEDICINES_READ' | 'MEDICINES_CREATE' | 'MEDICINES_UPDATE' | 'MEDICINES_DELETE'
  | 'BATCHES_READ' | 'BATCHES_CREATE' | 'BATCHES_UPDATE' | 'BATCHES_DELETE' | 'BATCHES_ADJUST'
  | 'DISPOSALS_READ' | 'DISPOSALS_CREATE' | 'DISPOSALS_UPDATE' | 'DISPOSALS_REVERT'
  | 'PATIENTS_READ' | 'PATIENTS_CREATE' | 'PATIENTS_UPDATE' | 'PATIENTS_DELETE'
  | 'APPOINTMENTS_READ' | 'APPOINTMENTS_CREATE' | 'APPOINTMENTS_UPDATE' | 'APPOINTMENTS_CANCEL' | 'APPOINTMENTS_DELETE'
  | 'SCHEDULES_READ' | 'SCHEDULES_CREATE' | 'SCHEDULES_UPDATE' | 'SCHEDULES_DELETE'
  | 'USERS_READ' | 'USERS_CREATE' | 'USERS_UPDATE' | 'USERS_DELETE'
  | 'ACTIVITY_LOGS_READ' | 'PROFILE_READ' | 'PROFILE_UPDATE' | 'SETTINGS_READ' | 'SETTINGS_UPDATE';

// mapa de compatibilidade com nomes antigos de recurso.
// codigo legado pode chamar requirePermission('medicines') e a gente
// traduz pra acao correta (MEDICINES_READ), evitando quebrar rotas antigas.
const LEGACY_RESOURCE_ACTIONS: Record<string, PermissionAction> = {
  medicines: 'MEDICINES_READ',
  batches: 'BATCHES_READ',
  disposals: 'DISPOSALS_READ',
  patients: 'PATIENTS_READ',
  appointments: 'APPOINTMENTS_READ',
  scheduleSlots: 'SCHEDULES_READ',
  users: 'USERS_READ',
  activityLogs: 'ACTIVITY_LOGS_READ',
};

// conjunto explicito de acoes do farmaceutico. ficou separado em constante
// porque e o papel com mais permissoes fora do admin, entao vale a pena
// ter ele isolado pra facilitar leitura e manutencao.
const FARMACEUTICO_ACTIONS = new Set<PermissionAction>([
  'MEDICINES_READ', 'MEDICINES_CREATE', 'MEDICINES_UPDATE', 'MEDICINES_DELETE',
  'BATCHES_READ', 'BATCHES_CREATE', 'BATCHES_UPDATE', 'BATCHES_DELETE', 'BATCHES_ADJUST',
  'DISPOSALS_READ', 'DISPOSALS_CREATE', 'DISPOSALS_UPDATE', 'DISPOSALS_REVERT',
  'PATIENTS_READ', 'PATIENTS_CREATE', 'PATIENTS_UPDATE', 'PATIENTS_DELETE',
  'APPOINTMENTS_READ', 'APPOINTMENTS_CREATE', 'APPOINTMENTS_UPDATE', 'APPOINTMENTS_CANCEL',
  'SCHEDULES_READ', 'SCHEDULES_CREATE', 'SCHEDULES_UPDATE', 'SCHEDULES_DELETE',
  'PROFILE_READ', 'PROFILE_UPDATE',
]);

// matriz de permissoes por papel. e o coracao da autorizacao do sistema.
// o admin ganha automaticamente READ/CREATE/UPDATE/DELETE em todos os
// recursos do LEGACY_RESOURCE_ACTIONS, mais algumas acoes especiais
// (ajustes de lote, reversao de descarte, cancelamento de consulta, etc).
// os outros papeis tem listas explicitas do que podem fazer.
const ROLE_ACTIONS: Record<string, Set<PermissionAction>> = {
  ADMIN: new Set(Object.keys(LEGACY_RESOURCE_ACTIONS).flatMap((resource) => {
    const action = LEGACY_RESOURCE_ACTIONS[resource];
    const [entity] = action.split('_');
    return [`${entity}_READ`, `${entity}_CREATE`, `${entity}_UPDATE`, `${entity}_DELETE`] as PermissionAction[];
  }).concat([
    'BATCHES_ADJUST', 'DISPOSALS_REVERT', 'APPOINTMENTS_CANCEL',
    'PROFILE_READ', 'PROFILE_UPDATE', 'SETTINGS_READ', 'SETTINGS_UPDATE', 'ACTIVITY_LOGS_READ',
  ])),
  FARMACEUTICO: FARMACEUTICO_ACTIONS,
  MEDICO: new Set<PermissionAction>([
    'MEDICINES_READ', 'APPOINTMENTS_READ', 'APPOINTMENTS_CREATE', 'APPOINTMENTS_CANCEL',
    'PATIENTS_READ', 'SCHEDULES_READ', 'PROFILE_READ', 'PROFILE_UPDATE',
  ]),
  ALUNO: new Set<PermissionAction>(['MEDICINES_READ', 'BATCHES_READ', 'DISPOSALS_READ', 'DISPOSALS_CREATE', 'PATIENTS_READ', 'PATIENTS_CREATE', 'PATIENTS_UPDATE', 'APPOINTMENTS_READ', 'APPOINTMENTS_CREATE', 'APPOINTMENTS_UPDATE', 'APPOINTMENTS_CANCEL', 'SCHEDULES_READ', 'PROFILE_READ', 'PROFILE_UPDATE']),
  PACIENTE: new Set<PermissionAction>(['MEDICINES_READ', 'APPOINTMENTS_READ', 'APPOINTMENTS_CREATE', 'APPOINTMENTS_CANCEL', 'PROFILE_READ', 'PROFILE_UPDATE', 'SCHEDULES_READ']),
};

// funcao central que decide se um usuario tem ou nao uma permissao.
// a ordem das checagens importa:
// 1) normaliza o papel em maiuscula pra bater com as chaves dos mapas
// 2) traduz nomes legados (ex: 'medicines') pra acao canonica
// 3) admin passa em tudo
// 4) checa se o papel tem a acao no ROLE_ACTIONS
// 5) por fim, olha permissoes customizadas que vieram no token
// isso permite dar a um usuario especifico uma permissao extra
// alem do que o papel dele normalmente teria.
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

  // sem permissoes customizadas no token, nao tem como liberar mais nada.
  if (!permissions) {
    return false;
  }

  // aceita tanto o nome canonico da acao quanto o nome legado,
  // mantendo compatibilidade com tokens antigos.
  if (permissions[action] === true) {
    return true;
  }

  if (permissions[permissionKey] === true) {
    return true;
  }

  return false;
}

// middleware que libera a rota so pra papeis especificos.
// usamos quando a regra depende do papel em si, nao de uma acao granular.
// exemplo: authorizeRoles('ADMIN', 'FARMACEUTICO').
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

// middleware que exige pelo menos uma das permissoes informadas.
// util quando a mesma rota serve pra mais de um fluxo, tipo um endpoint
// que pode ser acessado por quem tem X ou Y.
export function requireAnyPermission(...permissionKeys: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (req.user) {
      for (const key of permissionKeys) {
        if (hasPermission(req, key)) {
          next();
          return;
        }
      }
      res.status(403).json({ error: 'Acesso negado' });
    } else {
      res.status(401).json({ error: 'Não autenticado' });
    }
  };
}

// middleware que exige uma permissao especifica.
// e o mais usado nas rotas: cada endpoint declara a acao que precisa,
// e aqui a gente delega pro hasPermission decidir.
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