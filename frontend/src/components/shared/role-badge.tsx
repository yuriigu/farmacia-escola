// IMPORTS LOCAIS
import type { Role } from '@/lib/types';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/constants';

// INTERFACE DAS PROPRIEDADES DO CRACHA DE PAPEL
interface RoleBadgeProps {
  role?: string | null;
  className?: string;
}

// COMPONENTE DO CRACHA DE PAPEL DE USUARIO
export function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  // DETERMINANDO O PAPEL EM MAIUSCULAS
  let rawRole = 'PACIENTE';
  if (role) {
    rawRole = role.toUpperCase();
  } else {
    rawRole = 'PACIENTE';
  }
  const r = rawRole as Role;

  // DETERMINANDO O ROTULO DO PAPEL
  let label = 'Usuário';
  if (ROLE_LABELS[r]) {
    label = ROLE_LABELS[r];
  } else if (role) {
    label = role;
  } else {
    label = 'Usuário';
  }

  // DETERMINANDO A COR DO CRACHA
  let colorClass = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  if (ROLE_COLORS[r]) {
    colorClass = ROLE_COLORS[r];
  } else {
    colorClass = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }

  const combinedClassName = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ' + colorClass + ' ' + className;

  return (
    <span className={combinedClassName}>
      {label}
    </span>
  );
}