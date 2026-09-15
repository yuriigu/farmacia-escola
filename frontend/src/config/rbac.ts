// DEFINICAO DOS PAPEIS DO SISTEMA
export type AppRole = 'ADMIN' | 'FARMACEUTICO' | 'MEDICO' | 'ALUNO' | 'PACIENTE';

// CHAVES CANONICAS DE MODULO (UMA UNICA CHAVE POR TELA/SIDEBAR - SEM SINONIMOS)
export type ModuleKey =
  | 'dashboard'
  | 'medicamentos'
  | 'lotes'
  | 'descartes'
  | 'agendamentos'
  | 'calendario'
  | 'escala'
  | 'usuarios'
  | 'configuracoes';

// MAPEAMENTO DE PERMISSOES POR PAPEL (APENAS CHAVES CANONICAS)
export const rolePermissions: Record<AppRole, ModuleKey[]> = {
  ADMIN: [
    'dashboard',
    'medicamentos',
    'lotes',
    'descartes',
    'agendamentos',
    'calendario',
    'escala',
    'usuarios',
    'configuracoes',
  ],
  FARMACEUTICO: [
    'dashboard',
    'medicamentos',
    'lotes',
    'descartes',
    'agendamentos',
    'calendario',
    'escala',
    'usuarios',
    'configuracoes',
  ],
  ALUNO: [
    'dashboard',
    'medicamentos',
    'lotes',
    'descartes',
    'agendamentos',
    'calendario',
    'escala',
    'usuarios',
    'configuracoes',
  ],
  MEDICO: [
    'dashboard',
    'medicamentos',
    'agendamentos',
    'calendario',
    'usuarios',
    'configuracoes',
  ],
  PACIENTE: [
    'dashboard',
    'medicamentos',
    'agendamentos',
    'calendario',
    'configuracoes',
  ],
};

// DE-PARA UNICO: URL AMIGAVEL (PT), ROTA LEGADA (EN) OU ID DE MODULO (EN) -> CHAVE CANONICA
// Qualquer segmento que NAO esteja aqui e tratado como rota desconhecida (acesso negado).
const CANONICAL_ALIASES: Record<string, ModuleKey> = {
  // Dashboard
  dashboard: 'dashboard',
  // Medicamentos
  medicamentos: 'medicamentos',
  medicines: 'medicamentos',
  // Lotes (estoque/batches)
  lotes: 'lotes',
  estoque: 'lotes',
  // Descartes
  descartes: 'descartes',
  // Agendamentos
  agendamentos: 'agendamentos',
  appointments: 'agendamentos',
  'my-appointments': 'agendamentos',
  // Calendario
  calendario: 'calendario',
  // Escala
  escala: 'escala',
  escalas: 'escala',
  scales: 'escala',
  // Usuarios
  usuarios: 'usuarios',
  administracao: 'usuarios',
  admin: 'usuarios',
  pacientes: 'usuarios',
  // Configuracoes (perfil/settings)
  configuracoes: 'configuracoes',
  perfil: 'configuracoes',
  profile: 'configuracoes',
  settings: 'configuracoes',
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
