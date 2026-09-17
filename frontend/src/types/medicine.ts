import type { Batch } from './stock';
import type { StockStatus } from './stock';

// MEDICAMENTO CADASTRADO NO CATALOGO
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
  totalQuantity: number;
  physicalQuantity?: number;
  reservedQuantity?: number;
  availableQuantity?: number;
  batchesCount?: number;
  status?: StockStatus;
  batches?: Batch[];
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
}