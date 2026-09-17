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
  // Usuarios
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
