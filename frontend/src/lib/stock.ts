// FUNCAO PARA CALCULAR O STATUS DO ESTOQUE (LOGICA DE NEGOCIO - NAO E TIPO)
import type { StockStatus } from '@/types';

export function computeStockStatus(item: {
  totalQuantity?: number;
  physicalQuantity?: number;
  availableQuantity?: number;
  expirationDate?: string;
  isExpired?: boolean;
  isBlocked?: boolean;
}): StockStatus {
  if (item.isBlocked) {
    return 'BLOCKED';
  }
  if (item.isExpired) {
    return 'EXPIRED';
  }
  if (item.expirationDate) {
    const exp = new Date(item.expirationDate);
    const time = exp.getTime();
    const isNan = Number.isNaN(time);
    if (!isNan) {
      const now = Date.now();
      if (time < now) {
        return 'EXPIRED';
      }
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      if (time - now <= thirtyDaysMs) {
        return 'CRITICAL_EXPIRATION';
      }
    }
  }

  let qty = 0;
  if (item.totalQuantity !== null && item.totalQuantity !== undefined) {
    qty = item.totalQuantity;
  } else if (item.physicalQuantity !== null && item.physicalQuantity !== undefined) {
    qty = item.physicalQuantity;
  } else {
    qty = 0;
  }

  if (qty <= 0) {
    return 'OUT_OF_STOCK';
  }
  return 'IN_STOCK';
}