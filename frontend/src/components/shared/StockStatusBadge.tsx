// IMPORTS LOCAIS
import type { StockStatus } from '@/lib/Types';

// INTERFACE DAS PROPRIEDADES DO CRACHA DE STATUS DO ESTOQUE
interface StockStatusBadgeProps {
  status?: StockStatus;
}

// COMPONENTE PARA EXIBIR STATUS DO ESTOQUE
export function StockStatusBadge({ status }: StockStatusBadgeProps) {
  // DETERMINANDO STATUS NORMALIZADO COM FALLBACK
  let normalizedStatus: StockStatus = 'IN_STOCK';
  if (status) {
    if (status === 'CRITICAL_EXPIRATION') {
      normalizedStatus = 'CRITICAL_EXPIRATION';
    } else if (status === 'low') {
      normalizedStatus = 'CRITICAL_EXPIRATION';
    } else if (status === 'EXPIRED') {
      normalizedStatus = 'EXPIRED';
    } else if (status === 'expired') {
      normalizedStatus = 'EXPIRED';
    } else if (status === 'OUT_OF_STOCK') {
      normalizedStatus = 'OUT_OF_STOCK';
    } else if (status === 'critical') {
      normalizedStatus = 'OUT_OF_STOCK';
    } else if (status === 'IN_STOCK') {
      normalizedStatus = 'IN_STOCK';
    } else if (status === 'ok') {
      normalizedStatus = 'IN_STOCK';
    } else {
      normalizedStatus = 'IN_STOCK';
    }
  } else {
    normalizedStatus = 'IN_STOCK';
  }

  // CONFIGURACOES VISUAIS DOS STATUS DINAMICOS
  const config: Record<
    'IN_STOCK' | 'CRITICAL_EXPIRATION' | 'EXPIRED' | 'OUT_OF_STOCK',
    { label: string; bg: string; text: string; border: string; dot: string }
  > = {
    // IN_STOCK: Badge verde (disponivel)
    IN_STOCK: {
      label: 'Disponível',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800/80',
      dot: 'bg-emerald-500',
    },
    // CRITICAL_EXPIRATION: Badge amarelo/alerta (vencimento em <= 30 dias)
    CRITICAL_EXPIRATION: {
      label: 'Vencimento Próximo (≤ 30d)',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-300 dark:border-amber-700',
      dot: 'bg-amber-500',
    },
    // EXPIRED: Badge vermelho estatico (medicamento vencido)
    EXPIRED: {
      label: 'Vencido',
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      text: 'text-rose-700 dark:text-rose-400',
      border: 'border-rose-300 dark:border-rose-800',
      dot: 'bg-rose-600',
    },
    // OUT_OF_STOCK: Badge cinza/neutro (saldo zerado)
    OUT_OF_STOCK: {
      label: 'Sem Estoque',
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-600 dark:text-slate-400',
      border: 'border-slate-300 dark:border-slate-700',
      dot: 'bg-slate-400',
    },
  };

  let current = config.IN_STOCK;
  if (normalizedStatus === 'CRITICAL_EXPIRATION') {
    current = config.CRITICAL_EXPIRATION;
  } else if (normalizedStatus === 'EXPIRED') {
    current = config.EXPIRED;
  } else if (normalizedStatus === 'OUT_OF_STOCK') {
    current = config.OUT_OF_STOCK;
  } else {
    current = config.IN_STOCK;
  }

  const badgeClassName =
    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ' +
    current.bg +
    ' ' +
    current.text +
    ' ' +
    current.border;
  const dotClassName = 'w-1.5 h-1.5 rounded-full ' + current.dot;

  return (
    <span className={badgeClassName}>
      <span className={dotClassName} />
      {current.label}
    </span>
  );
}
