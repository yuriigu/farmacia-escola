import {
  LayoutDashboard, Package, Calendar, Settings,
  CalendarDays, Boxes, Trash2, Users, Clock
} from 'lucide-react';
import { hasRouteAccess } from '@/config/rbac';
import type { ModuleId, ModuleConfig } from '@/types';

// chaves de permissao usadas pelo client. batem com os recursos
// que o config/rbac e o server-side usam pra decidir acesso.
// sempre que uma tela nova precisar de permissao propria, ela
// entra aqui e no checkpermission abaixo.
export const PERMISSION_KEYS = {
  inventory: 'inventory',
  patients: 'patients',
  appointments: 'appointments',
  appointmentsOverview: 'appointmentsOverview',
  batches: 'batches',
  stockManagement: 'stockManagement',
  disposals: 'disposals',
  users: 'users',
  scheduleSlots: 'scheduleSlots',
} as const;

export type PermissionKey = keyof typeof PERMISSION_KEYS;

// permissoes default de aluno (conforme spec: acesso a todas as
// abas de estoque). o comentario fica aqui porque o mapa de fato
// vive no checkpermission logo abaixo.

// checagem de permissao no client. espelha parte do rbac do
// backend (mas simplificado), usada pra esconder/mostrar ui:
// - admin: tudo
// - farmaceutico e aluno: tudo menos "users"
// - medico: inventory, appointments, appointmentsoverview e patients
// - paciente: inventory, appointments e appointmentsoverview
// qualquer outro papel cai em false.
export function checkPermission(
  role: string,
  permissions: Record<string, boolean> | undefined | null,
  key: PermissionKey
): boolean {
  const normalizedRole = role.toUpperCase();
  if (normalizedRole === 'ADMIN') {
    return true;
  }
  if (normalizedRole === 'FARMACEUTICO') {
    if (key !== 'users') {
      return true;
    } else {
      return false;
    }
  }
  if (normalizedRole === 'ALUNO') {
    if (key !== 'users') {
      return true;
    } else {
      return false;
    }
  }
  if (normalizedRole === 'MEDICO') {
    const medicoAllowed: PermissionKey[] = ['inventory', 'appointments', 'appointmentsOverview', 'patients'];
    const isAllowed = medicoAllowed.includes(key);
    return isAllowed;
  }
  if (normalizedRole === 'PACIENTE') {
    let isPacienteAllowed = false;
    if (key === 'inventory') {
      isPacienteAllowed = true;
    } else if (key === 'appointments') {
      isPacienteAllowed = true;
    } else if (key === 'appointmentsOverview') {
      isPacienteAllowed = true;
    } else {
      isPacienteAllowed = false;
    }
    return isPacienteAllowed;
  }

  return false;
}

// checagem de escrita no client. espelha o canwrite do backend
// (role-guard.ts). decide se o usuario pode executar operacoes de
// escrita (create/update/delete) numa entidade.
// - admin: escreve em tudo
// - farmaceutico e aluno: tudo menos "users"
// - medico: appointments e patients
// - paciente: so appointments (as proprias)
// a ui usa isso pra esconder botoes e desabilitar acoes que o
// backend recusaria de qualquer forma.
export function canWriteClient(
  role: string | undefined | null,
  permissions: Record<string, boolean> | undefined | null,
  entity: string
): boolean {
  if (!role) {
    return false;
  }

  const normalizedRole = role.toUpperCase();

  if (normalizedRole === 'ADMIN') {
    return true;
  }
  if (normalizedRole === 'FARMACEUTICO') {
    if (entity !== 'users') {
      return true;
    } else {
      return false;
    }
  }
  if (normalizedRole === 'ALUNO') {
    if (entity !== 'users') {
      return true;
    } else {
      return false;
    }
  }
  if (normalizedRole === 'MEDICO') {
    if (entity === 'appointments') {
      return true;
    } else if (entity === 'patients') {
      return true;
    } else {
      return false;
    }
  }
  if (normalizedRole === 'PACIENTE') {
    if (entity === 'appointments') {
      return true;
    } else {
      return false;
    }
  }

  return false;
}

// rotulos amigaveis dos papeis (usados pelo rolebadge).
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  FARMACEUTICO: 'Farmacêutico',
  MEDICO: 'Médico',
  ALUNO: 'Aluno',
  PACIENTE: 'Paciente',
};

// paleta de cores por papel (usada pelo rolebadge). cada papel
// tem uma cor propria pra diferenciar rapido na tela.
export const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
  FARMACEUTICO: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  MEDICO: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
  ALUNO: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
  PACIENTE: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
};

// catalogo de modulos do sistema. cada modulo vira um item na
// sidebar, com icone, rota e regras proprias de acesso.
// os tipos moduled, tabid, moduletab e moduleconfig ficam
// centralizados em src/types/rbac.ts.
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
    id: 'inventory',
    label: 'Lotes',
    path: '/inventory',
    icon: Boxes,
    // paciente e medico nao acessam gestao de lotes.
    forbiddenRoles: ['PACIENTE', 'MEDICO'],
    tabs: [],
    defaultTab: '',
    actionLabels: {},
  },
  {
    id: 'disposals',
    label: 'Descartes',
    path: '/disposals',
    icon: Trash2,
    // idem: descarte e area da equipe, nao paciente/medico.
    forbiddenRoles: ['PACIENTE', 'MEDICO'],
    tabs: [],
    defaultTab: '',
    actionLabels: {},
  },
  {
    id: 'appointments',
    label: 'Agendamentos',
    path: '/appointments',
    icon: Calendar,
    tabs: [],
    defaultTab: '',
    actionLabels: {},
  },
  {
    id: 'calendar',
    label: 'Calendário',
    path: '/calendar',
    icon: CalendarDays,
    forbiddenRoles: [],
    tabs: [],
    defaultTab: '',
    actionLabels: {},
  },
  {
    id: 'scales',
    label: 'Escala',
    path: '/scales',
    icon: Clock,
    // escala e configuracao de agenda, nao acesso de medico/paciente.
    forbiddenRoles: ['MEDICO', 'PACIENTE'],
    tabs: [],
    defaultTab: '',
    actionLabels: {},
  },
  {
    id: 'users',
    label: 'Usuários',
    path: '/users',
    icon: Users,
    // paciente nao ve gestao de usuarios.
    forbiddenRoles: ['PACIENTE'],
    tabs: [],
    defaultTab: '',
    actionLabels: {},
  },
  {
    id: 'settings',
    label: 'Configurações',
    path: '/settings',
    icon: Settings,
    tabs: [],
    defaultTab: '',
    actionLabels: {},
  },
];

// resolve os modulos visiveis pra um papel. cada modulo passa por
// tres checagens, em ordem:
// 1) hasrouteaccess do config/rbac (o papel tem acesso a essa rota?)
// 2) forbiddenroles (se o papel estiver na lista, nega)
// 3) permissao customizada (se o modulo exige, checa via checkpermission)
// o resultado e a lista que a sidebar usa pra montar os links.
export function getVisibleModules(role: string, permissions?: Record<string, boolean> | null): ModuleConfig[] {
  const normalizedRole = role.toUpperCase();
  return MODULES.filter((mod) => {
    const hasAccess = hasRouteAccess(normalizedRole, mod.id);
    if (!hasAccess) {
      return false;
    }
    if (mod.forbiddenRoles) {
      if (mod.forbiddenRoles.map((item) => item.toUpperCase()).includes(normalizedRole)) {
        return false;
      }
    }
    if (mod.permission) {
      const allowed = checkPermission(normalizedRole, permissions, mod.permission as PermissionKey);
      if (!allowed) {
        return false;
      }
    }
    return true;
  });
}

// busca a config de um modulo pelo id. usada pelo appshell pra
// resolver titulo, icone e path da rota atual.
export function getModuleById(id: ModuleId): ModuleConfig | undefined {
  return MODULES.find((m) => m.id === id);
}

// paleta usada nos graficos do dashboard. cicla quando ha mais
// fatias/barras do que cores.
export const CHART_COLORS = ['#10b981', '#14b8a6', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

// estilos de badge por status de agendamento. casa com o label
// correspondente no apointment_status_labels abaixo.
export const APPOINTMENT_STATUS_STYLES: Record<string, string> = {
  CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  COMPLETED: 'bg-slate-100 text-slate-600 border-slate-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
};

// rotulos amigaveis dos status de agendamento.
export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  CONFIRMED: 'Confirmado',
  PENDING: 'Pendente',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

// paleta usada pra gerar a cor do avatar a partir do nome.
// o getavatarcollor faz o hash do nome e escolhe uma daqui.
export const AVATAR_COLORS = ['bg-emerald-500', 'bg-teal-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-500', 'bg-sky-500', 'bg-orange-500', 'bg-lime-500'];

// categorias de medicamento. a primeira (all) e usada so como
// filtro (nao como categoria real de um medicamento).
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

// mapa de chave -> rotulo amigavel da categoria. usado pelo
// categorybadge pra exibir o nome certo na tela.
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

// mapa de chave -> classes de cor da categoria. usado pelo
// categorybadge pra pintar o badge de acordo com a categoria.
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

// escolhe uma cor de avatar de forma deterministica a partir do
// nome. o hash simples garante que o mesmo nome sempre caia na
// mesma cor (evita "piscar" cores diferentes entre renders).
export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) { hash = name.charCodeAt(i) + ((hash << 5) - hash); }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// baixa um csv a partir de uma matriz de linhas. cada celula e
// envolvida em aspas e as aspas internas sao escapadas (norma do
// csv). o prefixo bom (\ufeff) faz o excel abrir em utf-8 sem
// virar caracteres estranhos.
export function downloadCSV(filename: string, rows: string[][]) {
  const csvContent = rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}