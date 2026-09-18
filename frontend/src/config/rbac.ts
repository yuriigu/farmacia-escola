// IMPORTS DOS TIPOS CENTRALIZADOS
import type { AppRole, ModuleKey } from '@/types';

// MAPEAMENTO DE PERMISSOES POR PAPEL (APENAS CHAVES CANONICAS)
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

// DE-PARA UNICO: URL AMIGAVEL (PT), ROTA LEGADA (EN) OU ID DE MODULO (EN) -> CHAVE CANONICA
// Qualquer segmento que NAO esteja aqui e tratado como rota desconhecida (acesso negado).
const CANONICAL_ALIASES: Record<string, ModuleKey> = {
  // Dashboard
  dashboard: 'dashboard',
  // Medicamentos
  medicamentos: 'medicines',
  medicines: 'medicines',
  // Lotes (estoque/batches/inventory)
  lotes: 'inventory',
  estoque: 'inventory',
  batches: 'inventory',
  inventory: 'inventory',
  // Descartes
  descartes: 'disposals',
  disposals: 'disposals',
  // Agendamentos
  agendamentos: 'appointments',
  appointments: 'appointments',
  'my-appointments': 'appointments',
  // Calendario
  calendario: 'calendar',
  calendar: 'calendar',
  // Escala
  escala: 'scales',
  escalas: 'scales',
  scales: 'scales',
  // Usuarios (inclui a rota fisica /users e seus apelidos)
  users: 'users',
  usuarios: 'users',
  administracao: 'users',
  admin: 'users',
  pacientes: 'users',
  // Configuracoes (perfil/settings)
  configuracoes: 'settings',
  perfil: 'settings',
  profile: 'settings',
  settings: 'settings',
};

// NORMALIZA A ROTA SOLICITADA (REMOVE BARRA INICIAL, QUERY E SUBSEGMENTOS)
// E TRADUZ O APELIDO DE URL PARA A CHAVE CANONICA
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

// FUNCAO PARA VERIFICAR SE O PAPEL TEM ACESSO A ROTA
// Rotas desconhecidas, papéis invalidos ou chamadas sem papel retornam false.
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

// ==================== GESTAO DE USUARIOS (PERMISSOES GRANULARES) ====================
// LISTA CANONICA DE PAPEIS EXISTENTES NO SISTEMA.
export const APP_ROLES: AppRole[] = ['ADMIN', 'FARMACEUTICO', 'MEDICO', 'ALUNO', 'PACIENTE'];

// PAPEIS QUE UM OPERADOR PODE ATRIBUIR AO CADASTRAR/EDITAR UM USUARIO.
// - ADMIN: qualquer perfil (ADMIN, FARMACEUTICO, MEDICO, ALUNO, PACIENTE).
// - FARMACEUTICO / MEDICO / ALUNO: EXCLUSIVAMENTE PACIENTE.
// - PACIENTE / PERFIL DESCONHECIDO: nenhum (sem acesso a gestao de usuarios).
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

// VERIFICA SE O ATOR PODE CRIAR UM USUARIO COM O PERFIL ALVO.
export function canCreateUser(actorRole: string | undefined | null, targetRole: string | undefined | null): boolean {
  if (!targetRole) {
    return false;
  }
  return getAssignableRoles(actorRole).includes(targetRole.toUpperCase() as AppRole);
}

// VERIFICA SE O ATOR PODE EDITAR UM USUARIO QUE POSSUI O PERFIL ALVO.
export function canEditUser(actorRole: string | undefined | null, targetRole: string | undefined | null): boolean {
  return canCreateUser(actorRole, targetRole);
}

// EXCLUSAO DE USUARIOS: EXCLUSIVAMENTE ADMIN.
export function canDeleteUser(actorRole: string | undefined | null): boolean {
  if (!actorRole) {
    return false;
  }
  return actorRole.toUpperCase() === 'ADMIN';
}
