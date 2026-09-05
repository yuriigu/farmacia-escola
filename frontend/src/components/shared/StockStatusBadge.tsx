// IMPORTS LOCAIS
import type { StockStatus } from '@/lib/Types';

// INTERFACE DAS PROPRIEDADES DO CRACHA DE STATUS DO ESTOQUE
interface StockStatusBadgeProps {
  status?: StockStatus;
}

// COMPONENTE PARA EXIBIR STATUS DO ESTOQUE
export function StockStatusBadge({ status }: StockStatusBadgeProps) {
  // DETERMINANDO STATUS COM FALLBACK
  let s: StockStatus = 'ok';
  if (status) {
    s = status;
  } else {
    s = 'ok';
  }

  // CONFIGURACOES DE CADA STATUS
  const config: Record<StockStatus, { label: string; bg: string; text: string; border: string; dot: string }> = {
    ok: {
      label: 'Em dia',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800/80',
      dot: 'bg-emerald-500',
    },
    low: {
      label: 'Baixo',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800/80',
      dot: 'bg-amber-500',
    },
    critical: {
      label: 'Crítico',
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      text: 'text-rose-700 dark:text-rose-400',
      border: 'border-rose-200 dark:border-rose-800/80',
      dot: 'bg-rose-500',
    },
    expired: {
      label: 'Vencido',
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-700 dark:text-slate-300',
      border: 'border-slate-300 dark:border-slate-700',
      dot: 'bg-slate-500',
    },
  };

  // OBTENDO A CONFIGURACAO ATUAL COM VERIFICACAO EXPLICITA
  let current = config.ok;
  if (config[s]) {
    current = config[s];
  } else {
    current = config.ok;
  }

  const badgeClassName = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ' + current.bg + ' ' + current.text + ' ' + current.border;
  const dotClassName = 'w-1.5 h-1.5 rounded-full ' + current.dot;

  return (
    <span className={badgeClassName}>
      <span className={dotClassName} />
      {current.label}
    </span>
  );
}