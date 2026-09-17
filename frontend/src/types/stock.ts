// STATUS CONSOLIDADO DE ESTOQUE/LOTE (CANONICO + ALIASES LEGADOS DO BACKEND)
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

// LOTE DE MEDICAMENTO (ESTOQUE MULTI-LOTE)
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

// RASCUNHO DE ENTRADA DE LOTE (FORMULARIOS)
export interface BatchEntryDraft {
  medicineId: number;
  batchNumber: string;
  currentQuantity: number;
  expirationDate: string;
  manufacturingDate?: string;
  supplier: string;
}