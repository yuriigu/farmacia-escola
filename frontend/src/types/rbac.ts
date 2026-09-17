// DEFINICAO DOS PAPEIS DO SISTEMA (FONTE CANONICA)
export type AppRole = 'ADMIN' | 'FARMACEUTICO' | 'MEDICO' | 'ALUNO' | 'PACIENTE';

// CHAVES CANONICAS DE MODULO (UMA UNICA CHAVE POR TELA/SIDEBAR - SEM SINONIMOS)
export type ModuleKey =
  | 'dashboard'
  | 'medicines'
  | 'inventory'
  | 'disposals'
  | 'appointments'
  | 'calendar'
  | 'scales'
  | 'users'
  | 'settings';

// ACAO FINE-GRAINED VERIFICADA PELO SISTEMA DE PERMISSOES
export type PermissionAction =
  | 'MEDICINES_READ' | 'MEDICINES_CREATE' | 'MEDICINES_UPDATE' | 'MEDICINES_DELETE'
  | 'BATCHES_READ' | 'BATCHES_CREATE' | 'BATCHES_UPDATE' | 'BATCHES_DELETE' | 'BATCHES_ADJUST'
  | 'DISPOSALS_READ' | 'DISPOSALS_CREATE' | 'DISPOSALS_UPDATE' | 'DISPOSALS_REVERT'
  | 'PATIENTS_READ' | 'PATIENTS_CREATE' | 'PATIENTS_UPDATE' | 'PATIENTS_DELETE'
  | 'APPOINTMENTS_READ' | 'APPOINTMENTS_CREATE' | 'APPOINTMENTS_UPDATE' | 'APPOINTMENTS_CANCEL' | 'APPOINTMENTS_DELETE'
  | 'SCHEDULES_READ' | 'SCHEDULES_CREATE' | 'SCHEDULES_UPDATE' | 'SCHEDULES_DELETE'
  | 'USERS_READ' | 'USERS_CREATE' | 'USERS_UPDATE' | 'USERS_DELETE'
  | 'ACTIVITY_LOGS_READ' | 'PROFILE_READ' | 'PROFILE_UPDATE' | 'SETTINGS_READ' | 'SETTINGS_UPDATE';

// IMPORT TYPE-ONLY (APAGADO EM TEMPO DE COMPILACAO - NAO GERA CICLO EM RUNTIME)
import type { PermissionKey } from '@/lib/constants';
import type { LucideIcon } from 'lucide-react';

// IDENTIFICADORES DO SISTEMA DE MODULOS E ABAS
export type ModuleId =
  | 'dashboard'
  | 'medicines'
  | 'inventory'
  | 'disposals'
  | 'appointments'
  | 'calendar'
  | 'scales'
  | 'users'
  | 'settings'
  | 'profile';

export type TabId = string;

export interface ModuleTab {
  id: TabId;
  label: string;
  icon: LucideIcon;
  /** Permission key needed to see this tab. If undefined, always visible within module */
  permission?: PermissionKey;
  /** Roles that are forbidden from seeing this tab */
  forbiddenRoles?: string[];
}

export interface ModuleConfig {
  id: ModuleId;
  label: string;
  path: string;
  icon: LucideIcon;
  /** Permission key needed to see this module in sidebar */
  permission?: PermissionKey;
  /** Roles that never see this module */
  forbiddenRoles?: string[];
  tabs: ModuleTab[];
  defaultTab: TabId;
  /** Dynamic action button label per tab */
  actionLabels: Record<TabId, string>;
}