import {
  LayoutDashboard, Package, Calendar, ShieldCheck, Settings,
  CalendarDays, Boxes, ArrowUpRight, Trash2, Users
} from 'lucide-react';
import { hasRouteAccess } from '@/config/rbac';

// ==================== PERMISSION KEYS ====================
export const PERMISSION_KEYS = {
  inventory: 'inventory',
  patients: 'patients',
  appointments: 'appointments',
  appointmentsOverview: 'appointmentsOverview',
  batches: 'batches',
  stockManagement: 'stockManagement',
  withdrawals: 'withdrawals',
  disposals: 'disposals',
  users: 'users',
  scheduleSlots: 'scheduleSlots',
} as const;

export type PermissionKey = keyof typeof PERMISSION_KEYS;

// Default permissions for ALUNO (matches spec: full access to inventory tabs)
export const DEFAULT_ALUNO_PERMISSIONS: Record<PermissionKey, boolean> = {
  inventory: true,
  patients: true,
  appointments: true,
  appointmentsOverview: true,
  batches: true,
  stockManagement: true,
  withdrawals: true,
  disposals: true,
  users: false,
  scheduleSlots: false,
};

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  inventory: 'Visualizar Estoque',
  patients: 'Visualizar Pacientes',
  appointments: 'Agendamentos de Retirada',
  appointmentsOverview: 'Agenda (Calendário)',
  batches: 'Gerenciar Lotes',
  stockManagement: 'Entrada de Lotes',
  withdrawals: 'Gerenciar Retiradas',
  disposals: 'Gerenciar Descartes',
  users: 'Gerenciar Usuários',
  scheduleSlots: 'Gerenciar Escala de Horários',
};

/**
 * Check frontend permission for current user
 */
export function checkPermission(
  role: string,
  permissions: Record<string, boolean> | undefined | null,
  key: PermissionKey
): boolean {
  if (role === 'ADMIN') return true;
  if (role === 'FARMACEUTICO') return key !== 'users';
  if (role === 'MEDICO') {
    const medicoAllowed: PermissionKey[] = ['inventory', 'appointments', 'appointmentsOverview', 'batches', 'withdrawals'];
    return medicoAllowed.includes(key);
  }
  if (role === 'PACIENTE') {
    return key === 'inventory' || key === 'appointments' || key === 'appointmentsOverview';
  }
  const perms = permissions ?? DEFAULT_ALUNO_PERMISSIONS;
  return perms[key] ?? false;
}

// ==================== CLIENT-SIDE WRITE CHECK ====================
/**
 * Entity identifiers that map to permission keys.
 * Must stay in sync with ENTITY_PERMISSION_MAP in role-guard.ts
 */
const ENTITY_PERMISSION_MAP: Record<string, PermissionKey> = {
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
 * Client-side canWrite — mirrors server-side canWrite in role-guard.ts.
 * Determines whether the current user can perform write (create/update/delete)
 * operations on a given entity.  Uses the in-memory permissions from auth-store.
 *
 * - ADMIN: write everything except 'users'... no wait, ADMIN writes everything.
 * - FARMACEUTICO: write everything except 'users'.
 * - MEDICO: write ONLY 'appointments' (create appointments via CPF flow).
 * - PACIENTE: write ONLY 'appointments' (own appointments).
 * - ALUNO: follows per-user permissions (falls back to DEFAULT_ALUNO_PERMISSIONS).
 */
export function canWriteClient(
  role: string | undefined | null,
  permissions: Record<string, boolean> | undefined | null,
  entity: string
): boolean {
  if (!role) return false;
  const permKey = ENTITY_PERMISSION_MAP[entity] ?? (entity as PermissionKey);
  if (role === 'ADMIN') return true;
  if (role === 'FARMACEUTICO') return entity !== 'users';
  if (role === 'MEDICO') return entity === 'appointments';
  if (role === 'PACIENTE') return entity === 'appointments';
  // ALUNO
  const perms = permissions ?? DEFAULT_ALUNO_PERMISSIONS;
  return perms[permKey] ?? false;
}

/**
 * Check if the current user is an admin.
 */
export function isAdmin(role: string | undefined | null): boolean {
  return role === 'ADMIN';
}

// ==================== ROLE BADGES & PALETTE ====================
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  FARMACEUTICO: 'Farmacêutico',
  MEDICO: 'Médico',
  ALUNO: 'Aluno / Estagiário',
  PACIENTE: 'Paciente',
};

export const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
  FARMACEUTICO: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  MEDICO: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
  ALUNO: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
  PACIENTE: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
};

// ==================== MODULE & TAB SYSTEM ====================
export type ModuleId =
  | 'dashboard'
  | 'medicines'
  | 'estoque'
  | 'retiradas'
  | 'descartes'
  | 'agendamentos'
  | 'calendario'
  | 'pacientes'
  | 'administracao'
  | 'configuracoes';

export type TabId = string;

export interface ModuleTab {
  id: TabId;
  label: string;
  icon: typeof LayoutDashboard;
  /** Permission key needed to see this tab. If undefined, always visible within module */
  permission?: PermissionKey;
  /** Roles that are forbidden from seeing this tab */
  forbiddenRoles?: string[];
}

export interface ModuleConfig {
  id: ModuleId;
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  /** Permission key needed to see this module in sidebar */
  permission?: PermissionKey;
  /** Roles that never see this module */
  forbiddenRoles?: string[];
  tabs: ModuleTab[];
  defaultTab: TabId;
  /** Dynamic action button label per tab */
  actionLabels: Record<TabId, string>;
}

export const MODULES: ModuleConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    tabs: [],
    defaultTab: '',
    actionLabels: {},
  },
  {
    id: 'medicines',
    label: 'Medicamentos',
    path: '/medicines',
    icon: Package,
    tabs: [],
    defaultTab: '',
    actionLabels: {},
  },
  {
    id: 'estoque',
    label: 'Estoque de Lotes',
    path: '/estoque',
    icon: Boxes,
    forbiddenRoles: ['PACIENTE', 'MEDICO'],
    tabs: [],
    defaultTab: '',
    actionLabels: {},
  },
  {
    id: 'retiradas',
    label: 'Retiradas',
    path: '/retiradas',
    icon: ArrowUpRight,
    forbiddenRoles: ['PACIENTE'],
    tabs: [],
    defaultTab: '',
    actionLabels: {},
  },
  {
    id: 'descartes',
    label: 'Descartes',
    path: '/descartes',
    icon: Trash2,
    forbiddenRoles: ['PACIENTE', 'MEDICO'],
    tabs: [],
    defaultTab: '',
    actionLabels: {},
  },
  {
    id: 'agendamentos',
    label: 'Agendamentos',
    path: '/agendamentos',
    icon: Calendar,
    tabs: [],
    defaultTab: '',
    actionLabels: {},
  },
  {
    id: 'calendario',
    label: 'Calendário Geral',
    path: '/calendario',
    icon: CalendarDays,
    tabs: [],
    defaultTab: '',
    actionLabels: {},
  },
  {
    id: 'pacientes',
    label: 'Pacientes',
    path: '/pacientes',
    icon: Users,
    forbiddenRoles: ['PACIENTE'],
    tabs: [],
    defaultTab: '',
    actionLabels: {},
  },
  {
    id: 'administracao',
    label: 'Administração',
    path: '/administracao',
    icon: ShieldCheck,
    forbiddenRoles: ['PACIENTE', 'MEDICO', 'ALUNO'],
    tabs: [],
    defaultTab: '',
    actionLabels: {},
  },
  {
    id: 'configuracoes',
    label: 'Configurações',
    path: '/configuracoes',
    icon: Settings,
    tabs: [],
    defaultTab: '',
    actionLabels: {},
  },
];

/** Get visible modules for a given role */
export function getVisibleModules(role: string, permissions?: Record<string, boolean> | null): ModuleConfig[] {
  return MODULES.filter((mod) => {
    if (!hasRouteAccess(role, mod.id)) return false;
    if (mod.forbiddenRoles?.includes(role)) return false;
    if (mod.permission && !checkPermission(role, permissions, mod.permission as PermissionKey)) return false;
    return true;
  });
}

/** Get visible tabs for a given module and role */
export function getVisibleTabs(module: ModuleConfig, role: string, permissions?: Record<string, boolean> | null): ModuleTab[] {
  if (!module.tabs.length) return [];
  return module.tabs.filter((tab) => {
    if (tab.forbiddenRoles?.includes(role)) return false;
    if (tab.permission && !checkPermission(role, permissions, tab.permission as PermissionKey)) return false;
    return true;
  });
}

/** Find module config by id */
export function getModuleById(id: ModuleId): ModuleConfig | undefined {
  return MODULES.find((m) => m.id === id);
}

// ==================== LEGACY NAVIGATION (kept for internal use) ====================
export type Page = 'login' | 'register' | 'profile' | 'inventory' | 'stock-management' | 'withdrawals' | 'appointments' | 'appointments-overview' | 'schedule-slots' | 'disposals' | 'patients' | 'admin' | 'settings';

export const MENU_ITEMS: { id: Page; label: string; icon: typeof LayoutDashboard; permission?: PermissionKey }[] = [
  { id: 'inventory', label: 'Estoque / Medicamentos', icon: Package, permission: 'inventory' },
  { id: 'appointments-overview', label: 'Agenda (Calendário)', icon: CalendarDays, permission: 'appointmentsOverview' },
  { id: 'appointments', label: 'Agendamentos de Retirada', icon: Calendar, permission: 'appointments' },
];

export const PAGE_TITLES: Record<Page, string> = {
  login: 'Entrar no Sistema',
  register: 'Criar Conta de Paciente',
  inventory: 'Estoque & Catálogo de Medicamentos',
  'stock-management': 'Gestão e Entrada de Lotes',
  withdrawals: 'Saídas e Retiradas de Pacientes',
  'appointments-overview': 'Agenda de Retiradas',
  appointments: 'Agendamentos de Retirada',
  disposals: 'Registro e Controle de Descartes',
  patients: 'Cadastro de Pacientes',
  admin: 'Painel Administrativo de Usuários',
  settings: 'Configurações do Sistema',
  profile: 'Meu Perfil',
  'schedule-slots': 'Escala de Horários',
};

// ==================== CHART CONFIG ====================
export const CHART_COLORS = ['#10b981', '#14b8a6', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

// ==================== STATUS STYLES ====================
export const APPOINTMENT_STATUS_STYLES: Record<string, string> = {
  CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  COMPLETED: 'bg-slate-100 text-slate-600 border-slate-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  CONFIRMED: 'Confirmado',
  PENDING: 'Pendente',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

// ==================== AVATAR COLORS ====================
export const AVATAR_COLORS = ['bg-emerald-500', 'bg-teal-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-500', 'bg-sky-500', 'bg-orange-500', 'bg-lime-500'];

// ==================== MEDICINE CATEGORIES ====================
export const MEDICINE_CATEGORIES = [
  { id: 'all', label: 'Todas', color: 'bg-slate-100 text-slate-600' },
  { id: 'analgesico', label: 'Analgésico', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'anti-inflamatorio', label: 'Anti-inflamatório', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  { id: 'antibiotico', label: 'Antibiótico', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'antialergico', label: 'Antialérgico', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { id: 'vitamina', label: 'Vitamina/Supl.', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { id: 'antihipertensivo', label: 'Anti-hipertensivo', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'antidiabetico', label: 'Antidiabético', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { id: 'outro', label: 'Outro', color: 'bg-slate-50 text-slate-500 border-slate-200' },
] as const;

export const MEDICINE_CATEGORY_LABELS: Record<string, string> = {
  'analgesico': 'Analgésico',
  'anti-inflamatorio': 'Anti-inflamatório',
  'antibiotico': 'Antibiótico',
  'antialergico': 'Antialérgico',
  'vitamina': 'Vitamina/Supl.',
  'antihipertensivo': 'Anti-hipertensivo',
  'antidiabetico': 'Antidiabético',
  'outro': 'Outro',
};

export const MEDICINE_CATEGORY_COLORS: Record<string, string> = {
  'analgesico': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'anti-inflamatorio': 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  'antibiotico': 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'antialergico': 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  'vitamina': 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'antihipertensivo': 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  'antidiabetico': 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-rose-400',
  'outro': 'bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400',
};

// ==================== VERSION ====================
export const APP_VERSION = 'v1.10.1';

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) { hash = name.charCodeAt(i) + ((hash << 5) - hash); }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function downloadCSV(filename: string, rows: string[][]) {
  const csvContent = rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}