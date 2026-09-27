// status consolidado de estoque/lote.
// cobre duas familias: as chaves canonicas do backend (in_stock,
// low_stock, critical_expiration, expired, out_of_stock, blocked)
// e os aliases legados usados em telas e no client (ativo,
// vencido, esgotado, bloqueado, ok, low, critical, expired,
// venc. prox). os dois grupos convivem pra nao quebrar consumidores
// antigos.
export type StockStatus =
  | 'IN_STOCK'
  | 'LOW_STOCK'
  | 'CRITICAL_EXPIRATION'
  | 'EXPIRED'
  | 'OUT_OF_STOCK'
  | 'BLOCKED'
  | 'Ativo'
  | 'Vencido'
  | 'Esgotado'
  | 'Bloqueado'
  | 'ok'
  | 'low'
  | 'critical'
  | 'expired'
  | 'Venc. Próx';

// lote de medicamento (estoque multi-lote).
// cada lote tem numero proprio, saldo atual, validade e dados
// de recebimento. permite bloqueio sanitario (isblocked + motivo)
// e traz um resumo do medicamento junto quando a consulta inclui.
export interface Batch {
  id: number;
  medicineId: number;
  batchNumber: string;
  currentQuantity: number;
  expirationDate: string;
  manufacturingDate?: string | null;
  supplier?: string;
  isBlocked?: boolean;
  blockReason?: string | null;
  receivedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: StockStatus;
  medicine?: {
    id: number;
    name: string;
    dosage: string | null;
  };
}

// rascunho de entrada de lote usado no formulario de cadastro.
// versao enxuta com so o que o usuario preenche antes de mandar
// pra api.
export interface BatchEntryDraft {
  medicineId: number;
  batchNumber: string;
  currentQuantity: number;
  expirationDate: string;
  manufacturingDate?: string;
  supplier: string;
}