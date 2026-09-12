// IMPORTS LOCAIS
import type { StockStatus } from '@/lib/types';

// INTERFACE DAS PROPRIEDADES DO CRACHA DE STATUS DO ESTOQUE
interface StockStatusBadgeProps {
  status?: StockStatus | string;
}

// COMPONENTE PARA EXIBIR STATUS DO ESTOQUE
export function StockStatusBadge({ status }: StockStatusBadgeProps) {
  let labelText = 'Ativo';
  let badgeBg = 'bg-emerald-50 dark:bg-emerald-950/40';
  let badgeText = 'text-emerald-700 dark:text-emerald-400';
  let badgeBorder = 'border-emerald-200 dark:border-emerald-800/80';
  let dotColor = 'bg-emerald-500';

  if (status) {
    if (status === 'BLOCKED') {
      labelText = 'Bloqueado';
      badgeBg = 'bg-rose-100 dark:bg-rose-950/70';
      badgeText = 'text-rose-800 dark:text-rose-300 font-bold';
      badgeBorder = 'border-rose-400 dark:border-rose-700';
      dotColor = 'bg-rose-600 animate-pulse';
    } else if (status === 'Bloqueado') {
      labelText = 'Bloqueado';
      badgeBg = 'bg-rose-100 dark:bg-rose-950/70';
      badgeText = 'text-rose-800 dark:text-rose-300 font-bold';
      badgeBorder = 'border-rose-400 dark:border-rose-700';
      dotColor = 'bg-rose-600 animate-pulse';
    } else if (status === 'ok') {
      labelText = 'Em dia';
      badgeBg = 'bg-emerald-50 dark:bg-emerald-950/40';
      badgeText = 'text-emerald-700 dark:text-emerald-400';
      badgeBorder = 'border-emerald-200 dark:border-emerald-800/80';
      dotColor = 'bg-emerald-500';
    } else if (status === 'low') {
      labelText = 'Baixo';
      badgeBg = 'bg-amber-50 dark:bg-amber-950/40';
      badgeText = 'text-amber-800 dark:text-amber-300';
      badgeBorder = 'border-amber-300 dark:border-amber-700';
      dotColor = 'bg-amber-500';
    } else if (status === 'critical') {
      labelText = 'Crítico';
      badgeBg = 'bg-slate-100 dark:bg-slate-800';
      badgeText = 'text-slate-600 dark:text-slate-400';
      badgeBorder = 'border-slate-300 dark:border-slate-700';
      dotColor = 'bg-slate-400';
    } else if (status === 'CRITICAL_EXPIRATION' || status === 'Venc. Próx' || status === 'Vencimento Próximo' || status === 'Vencimento Próximo (≤ 30d)') {
      labelText = 'Venc. Próx';
      badgeBg = 'bg-amber-50 dark:bg-amber-950/40';
      badgeText = 'text-amber-800 dark:text-amber-300';
      badgeBorder = 'border-amber-300 dark:border-amber-700';
      dotColor = 'bg-amber-500';
    } else if (status === 'EXPIRED') {
      labelText = 'Vencido';
      badgeBg = 'bg-rose-50 dark:bg-rose-950/40';
      badgeText = 'text-rose-700 dark:text-rose-400';
      badgeBorder = 'border-rose-300 dark:border-rose-800';
      dotColor = 'bg-rose-600';
    } else if (status === 'expired') {
      labelText = 'Vencido';
      badgeBg = 'bg-rose-50 dark:bg-rose-950/40';
      badgeText = 'text-rose-700 dark:text-rose-400';
      badgeBorder = 'border-rose-300 dark:border-rose-800';
      dotColor = 'bg-rose-600';
    } else if (status === 'Vencido') {
      labelText = 'Vencido';
      badgeBg = 'bg-rose-50 dark:bg-rose-950/40';
      badgeText = 'text-rose-700 dark:text-rose-400';
      badgeBorder = 'border-rose-300 dark:border-rose-800';
      dotColor = 'bg-rose-600';
    } else if (status === 'OUT_OF_STOCK') {
      labelText = 'Esgotado';
      badgeBg = 'bg-slate-100 dark:bg-slate-800';
      badgeText = 'text-slate-600 dark:text-slate-400';
      badgeBorder = 'border-slate-300 dark:border-slate-700';
      dotColor = 'bg-slate-400';
    } else if (status === 'Esgotado') {
      labelText = 'Esgotado';
      badgeBg = 'bg-slate-100 dark:bg-slate-800';
      badgeText = 'text-slate-600 dark:text-slate-400';
      badgeBorder = 'border-slate-300 dark:border-slate-700';
      dotColor = 'bg-slate-400';
    } else if (status === 'Ativo') {
      labelText = 'Ativo';
      badgeBg = 'bg-emerald-50 dark:bg-emerald-950/40';
      badgeText = 'text-emerald-700 dark:text-emerald-400';
      badgeBorder = 'border-emerald-200 dark:border-emerald-800/80';
      dotColor = 'bg-emerald-500';
    } else if (status === 'IN_STOCK') {
      labelText = 'Ativo';
      badgeBg = 'bg-emerald-50 dark:bg-emerald-950/40';
      badgeText = 'text-emerald-700 dark:text-emerald-400';
      badgeBorder = 'border-emerald-200 dark:border-emerald-800/80';
      dotColor = 'bg-emerald-500';
    } else {
      labelText = 'Ativo';
      badgeBg = 'bg-emerald-50 dark:bg-emerald-950/40';
      badgeText = 'text-emerald-700 dark:text-emerald-400';
      badgeBorder = 'border-emerald-200 dark:border-emerald-800/80';
      dotColor = 'bg-emerald-500';
    }
  } else {
    labelText = 'Ativo';
    badgeBg = 'bg-emerald-50 dark:bg-emerald-950/40';
    badgeText = 'text-emerald-700 dark:text-emerald-400';
    badgeBorder = 'border-emerald-200 dark:border-emerald-800/80';
    dotColor = 'bg-emerald-500';
  }

  const badgeClassName =
    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ' +
    badgeBg +
    ' ' +
    badgeText +
    ' ' +
    badgeBorder;
  const dotClassName = 'w-1.5 h-1.5 rounded-full ' + dotColor;

  return (
    <span className={badgeClassName}>
      <span className={dotClassName} />
      {labelText}
    </span>
  );
}
