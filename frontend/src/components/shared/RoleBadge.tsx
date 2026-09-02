import type { Role } from '@/lib/types';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/constants';

interface RoleBadgeProps {
  role?: string | null;
  className?: string;
}

export function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  const r = (role?.toUpperCase() || 'PACIENTE') as Role;
  const label = ROLE_LABELS[r] || role || 'Usuário';
  const colorClass = ROLE_COLORS[r] || 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClass} ${className}`}
    >
      {label}
    </span>
  );
}