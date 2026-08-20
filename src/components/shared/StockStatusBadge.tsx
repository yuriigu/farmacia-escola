import type { StockStatus } from '@/lib/types';

export function StockStatusBadge({ status }: { status?: StockStatus }) {
  const s = status || 'ok';
  const styles: Record<string, string> = {
    ok: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    low: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    critical: 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800',
    expired: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  };
  const labels: Record<string, string> = {
    ok: 'Em Dia',
    low: 'Estoque Baixo',
    critical: 'Crítico',
    expired: 'Vencido',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[s] || styles.ok}`}>
      {labels[s] || s}
    </span>
  );
}
