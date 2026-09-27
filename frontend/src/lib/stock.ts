// funcao que calcula o status de estoque de um item no client.
// e regra de negocio (nao e tipo), por isso fica aqui em lib/stock
// e nao junto com os tipos.
// a ordem das checagens importa:
// 1) bloqueado tem prioridade sobre tudo (o item sai de circulacao
//    independente do saldo/validade)
// 2) ja marcado como vencido (flag explicita do item)
// 3) data de validade parseavel e ja passou
// 4) data de validade parseavel e vence em ate 30 dias -> critico
// 5) quantidade zerada -> esgotado
// 6) caso contrario -> em estoque
// o fallback de quantidade usa totalquantity, cai pra physicalquantity,
// por fim zero.
import type { StockStatus } from '@/types';

export function computeStockStatus(item: {
  totalQuantity?: number;
  physicalQuantity?: number;
  availableQuantity?: number;
  expirationDate?: string;
  isExpired?: boolean;
  isBlocked?: boolean;
}): StockStatus {
  // bloqueado tem prioridade maxima: mesmo com saldo e validade
  // bons, o item nao pode ser usado.
  if (item.isBlocked) {
    return 'BLOCKED';
  }
  // se o proprio item ja veio marcado como vencido, respeita a flag.
  if (item.isExpired) {
    return 'EXPIRED';
  }
  // se veio data de validade, tenta calcular pela data. se nao
  // parsear (string invalida), pula a checagem de validade.
  if (item.expirationDate) {
    const exp = new Date(item.expirationDate);
    const time = exp.getTime();
    const isNan = Number.isNaN(time);
    if (!isNan) {
      const now = Date.now();
      // data ja passou: vencido.
      if (time < now) {
        return 'EXPIRED';
      }
      // vence em ate 30 dias: critico.
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      if (time - now <= thirtyDaysMs) {
        return 'CRITICAL_EXPIRATION';
      }
    }
  }

  // fallback de quantidade: totalquantity > physicalquantity > 0.
  let qty = 0;
  if (item.totalQuantity !== null && item.totalQuantity !== undefined) {
    qty = item.totalQuantity;
  } else if (item.physicalQuantity !== null && item.physicalQuantity !== undefined) {
    qty = item.physicalQuantity;
  } else {
    qty = 0;
  }

  // sem saldo: esgotado.
  if (qty <= 0) {
    return 'OUT_OF_STOCK';
  }
  // caso comum: em estoque.
  return 'IN_STOCK';
}