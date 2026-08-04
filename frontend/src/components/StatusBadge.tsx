import { StockStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: StockStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = (status || '').toLowerCase();
  
  let styles = 'bg-slate-100 text-slate-700 border-slate-200';
  let label = status;

  if (normalized === 'ok' || normalized === 'em dia' || normalized === 'normal') {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    label = 'Em Dia';
  } else if (normalized === 'low' || normalized === 'baixo' || normalized === 'atenção') {
    styles = 'bg-amber-50 text-amber-700 border-amber-200';
    label = 'Estoque Baixo';
  } else if (normalized === 'critical' || normalized === 'crítico' || normalized === 'urgente') {
    styles = 'bg-rose-50 text-rose-700 border-rose-200';
    label = 'Crítico';
  } else if (normalized === 'expired' || normalized === 'vencido') {
    styles = 'bg-purple-50 text-purple-700 border-purple-200';
    label = 'Vencido';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles}`}>
      {label}
    </span>
  );
}
