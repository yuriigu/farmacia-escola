// imports dos tipos centralizados
import type { AppRole, ModuleKey } from '@/types';

// mapa de permissoes por papel. cada entrada lista as chaves
// canonicas de modulo que aquele papel acessa. qualquer modulo
// fora da lista e bloqueado. admin, farmaceutico e aluno veem o
// sistema praticamente inteiro; medico perde estoque/descartes e
// paciente fica com o essencial (dashboard, medicamentos,
// agendamentos, calendario e settings).
export const rolePermissions: Record<AppRole, ModuleKey[]> = {
  ADMIN: [
    'dashboard',
    'medicines',
    'inventory',
    'disposals',
    'appointments',
    'calendar',
    'scales',
    'users',
    'settings',
  ],
  FARMACEUTICO: [
    'dashboard',
    'medicines',
    'inventory',
    'disposals',
    'appointments',
    'calendar',
    'scales',
    'users',
    'settings',
  ],
  ALUNO: [
    'dashboard',
    'medicines',
    'inventory',
    'disposals',
    'appointments',
    'calendar',
    'scales',
    'users',
    'settings',
  ],
  MEDICO: [
    'dashboard',
    'medicines',
    'appointments',
    'calendar',
    'users',
    'settings',
  ],
  PACIENTE: [
    'dashboard',
    'medicines',
    'appointments',
    'calendar',
    'settings',
  ],
};

// de-para unico que traduz tres formatos de entrada (url amigavel
// em portugues, rota legada em ingles ou id de modulo) pra chave
// canonica. qualquer segmento fora daqui cai em "rota desconhecida"
// e o hasRouteAccess acaba negando o acesso.
const CANONICAL_ALIASES: Record<string, ModuleKey> = {
  // dashboard
  dashboard: 'dashboard',
  // medicamentos
  medicamentos: 'medicines',
  medicines: 'medicines',
  // lotes (estoque/batches/inventory)
  lotes: 'inventory',
  estoque: 'inventory',
  batches: 'inventory',
  inventory: 'inventory',
  // descartes
  descartes: 'disposals',
  disposals: 'disposals',
  // agendamentos
  agendamentos: 'appointments',
  appointments: 'appointments',
  'my-appointments': 'appointments',
  // calendario
  calendario: 'calendar',
  calendar: 'calendar',
  // escala
  escala: 'scales',
  escalas: 'scales',
  scales: 'scales',
  // usuarios (inclui a rota fisica /users e seus apelidos)
  users: 'users',
  usuarios: 'users',
  administracao: 'users',
  admin: 'users',
  pacientes: 'users',
  // configuracoes (perfil/settings)
  configuracoes: 'settings',
  perfil: 'settings',
  profile: 'settings',
  settings: 'settings',
};

// normaliza a rota solicitada (tira barra inicial, query e
// subsegmentos) e traduz o apelido pra chave canonica.
// o que sobra depois do split('/') e o primeiro segmento, que e
// o que decide o modulo.
function toModuleKey(routeOrModule: string): ModuleKey | undefined {
  const clean = routeOrModule
    .replace(/^\/+/, '')
    .split('?')[0]
    .split('/')[0]
    .trim()
    .toLowerCase();
  if (!clean) {
    return undefined;
  }
  return CANONICAL_ALIASES[clean];
}

// checagem principal de autorizacao por rota. devolve true so
// quando o papel existe, a rota resolve pra um modulo conhecido e
// esse modulo esta na lista de permissoes do papel. qualquer caso
// de erro (sem papel, papel desconhecido, rota desconhecida) vira
// false — o default e negar.
export function hasRouteAccess(role: string | undefined | null, routeOrModule: string): boolean {
  if (!role) {
    return false;
  }
  const permissions = rolePermissions[role.toUpperCase() as AppRole];
  if (!permissions) {
    return false;
  }
  const moduleKey = toModuleKey(routeOrModule);
  if (!moduleKey) {
    return false;
  }
  return permissions.includes(moduleKey);
}

// gestao de usuarios (permissoes granulares).
// alem do rbac por rota, a area de usuarios tem regras especificas
// sobre quem pode gerenciar quem. as funcoes abaixo cobrem essas
// regras e sao consumidas pela tela de admin e pelos controllers.

// lista canonica de papeis existentes no sistema.
export const APP_ROLES: AppRole[] = ['ADMIN', 'FARMACEUTICO', 'MEDICO', 'ALUNO', 'PACIENTE'];

// resolve quais papeis um operador pode atribuir ao criar ou editar
// um usuario. regra:
// - admin: pode tudo (todos os papeis)
// - farmaceutico, medico e aluno: so pode cadastrar paciente
// - paciente ou papel desconhecido: nenhum (sem acesso a gestao)
export function getAssignableRoles(actorRole: string | undefined | null): AppRole[] {
  if (!actorRole) {
    return [];
  }

  const normalizedRole = actorRole.toUpperCase();

  if (normalizedRole === 'ADMIN') {
    return [...APP_ROLES];
  }

  if (normalizedRole === 'FARMACEUTICO' || normalizedRole === 'MEDICO' || normalizedRole === 'ALUNO') {
    return ['PACIENTE'];
  }

  return [];
}

// checa se o operador pode criar um usuario com o perfil alvo.
// e um atalho que reusa a regra do getassignableroles.
export function canCreateUser(actorRole: string | undefined | null, targetRole: string | undefined | null): boolean {
  if (!targetRole) {
    return false;
  }
  return getAssignableRoles(actorRole).includes(targetRole.toUpperCase() as AppRole);
}

// checa se o operador pode editar um usuario com o perfil alvo.
// a regra e a mesma do create: quem pode criar tambem pode editar.
export function canEditUser(actorRole: string | undefined | null, targetRole: string | undefined | null): boolean {
  return canCreateUser(actorRole, targetRole);
}

// exclusao de usuarios: mais restrita que create/edit.
// so admin pode excluir, independente do perfil alvo.
export function canDeleteUser(actorRole: string | undefined | null): boolean {
  if (!actorRole) {
    return false;
  }
  return actorRole.toUpperCase() === 'ADMIN';
}