import type { Batch } from './stock';
import type { StockStatus } from './stock';

// medicamento cadastrado no catalogo.
// além dos dados basicos (nome, principio ativo, dosagem, categoria),
// traz os campos derivados de estoque que a api calcula por
// medicamento:
// - totalquantity: soma valida dos lotes ativos
// - physicalquantity: alias de leitura pro total fisico
// - reservedquantity: reservado por agendamentos em aberto
// - availablequantity: disponivel real (fisico - reservado)
// - batchescount: quantos lotes entram no calculo
// - status: faixa consolidada (em dia, baixo, critico, vencido)
// o batches opcional so aparece quando a consulta pediu os lotes
// (ex: modal de detalhe). o deletedat e o soft delete do catalogo.
export interface Medicine {
  id: number;
  name: string;
  activeIngredient: string;
  dosage: string;
  dosageValue?: number | null;
  dosageUnit?: string | null;
  minQuantity?: number;
  accessibleDesc: string;
  category?: string | null;
  totalQuantity?: number;
  physicalQuantity?: number;
  reservedQuantity?: number;
  availableQuantity?: number;
  available?: boolean;
  hasStock?: boolean;
  batchesCount?: number;
  status?: StockStatus;
  batches?: Batch[];
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
}