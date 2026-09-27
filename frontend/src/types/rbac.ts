// papeis do sistema (fonte canonica). qualquer outro lugar que
// precise do conjunto de papeis deve importar daqui, pra nao
// existir divergencia entre backend, rbac e ui.
export type AppRole = 'ADMIN' | 'FARMACEUTICO' | 'MEDICO' | 'ALUNO' | 'PACIENTE';

// chaves canonicas de modulo (uma unica chave por tela/sidebar,
// sem sinonimos). qualquer alias (url amigavel em portugues, rota
// legada em ingles) e traduzido pra uma dessas chaves antes de
// chegar no rbac. assim as permissoes tem so uma representacao.
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

// acao fine-grained verificada pelo sistema de permissoes.
// cada acao segue o padrao recurso_verbo (ex: medicines_create)
// e e o que o haspermission avalia pra decidir acesso.
export type PermissionAction =
  | 'MEDICINES_READ' | 'MEDICINES_CREATE' | 'MEDICINES_UPDATE' | 'MEDICINES_DELETE'
  | 'BATCHES_READ' | 'BATCHES_CREATE' | 'BATCHES_UPDATE' | 'BATCHES_DELETE' | 'BATCHES_ADJUST'
  | 'DISPOSALS_READ' | 'DISPOSALS_CREATE' | 'DISPOSALS_UPDATE' | 'DISPOSALS_REVERT'
  | 'PATIENTS_READ' | 'PATIENTS_CREATE' | 'PATIENTS_UPDATE' | 'PATIENTS_DELETE'
  | 'APPOINTMENTS_READ' | 'APPOINTMENTS_CREATE' | 'APPOINTMENTS_UPDATE' | 'APPOINTMENTS_CANCEL' | 'APPOINTMENTS_DELETE'
  | 'SCHEDULES_READ' | 'SCHEDULES_CREATE' | 'SCHEDULES_UPDATE' | 'SCHEDULES_DELETE'
  | 'USERS_READ' | 'USERS_CREATE' | 'USERS_UPDATE' | 'USERS_DELETE'
  | 'ACTIVITY_LOGS_READ' | 'PROFILE_READ' | 'PROFILE_UPDATE' | 'SETTINGS_READ' | 'SETTINGS_UPDATE';

// import type-only (apagado em tempo de compilacao, nao gera
// ciclo em runtime). o permissionkey vem do constants e o
// lucideicon e o tipo de icone da lib lucide.
import type { PermissionKey } from '@/lib/constants';
import type { LucideIcon } from 'lucide-react';

// identificadores do sistema de modulos e abas.
// moduleid inclui todos os modulos (inclusive 'profile', que
// nao esta em modulekey porque nao e um item de sidebar proprio,
// mas tem rota).
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

// id de aba e uma string livre. cada modulo define as suas.
export type TabId = string;

// configuracao de uma aba dentro de um modulo.
// o permission e opcional (quando undefined, a aba e visivel
// pra quem enxerga o modulo). o forbiddenroles permite negar a
// aba especificamente pra certos papeis.
export interface ModuleTab {
  id: TabId;
  label: string;
  icon: LucideIcon;
  /** Permission key needed to see this tab. If undefined, always visible within module */
  permission?: PermissionKey;
  /** Roles that are forbidden from seeing this tab */
  forbiddenRoles?: string[];
}

// configuracao de um modulo da sidebar.
// id aponta pro moduleid, path e a url, icon o icone da sidebar,
// tabs e a lista de abas internas, defaulttab a aba inicial e
// actionlabels o texto de cada botao de acao daquela aba.
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