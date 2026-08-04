export type StockStatus = 'ok' | 'low' | 'critical' | 'expired' | 'warning' | string;

export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  manufacturer?: string;
  batchNumber?: string;
  expirationDate?: string;
  quantity?: number;
}

export interface Patient {
  id: string;
  name: string;
  cpf: string;
  phone?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface Batch {
  id: string;
  code: string;
  medicine?: Medicine;
  quantity: number;
  expirationDate: string;
}

export interface Disposal {
  id: string;
  patient?: Patient;
  batch?: Batch;
  user?: User;
  reason?: string;
  createdAt?: string;
  /** id do item de estoque afetado, usado para devolver a quantidade ao descartar/reverter */
  inventoryItemId?: string;
  /** indica que o descarte foi revertido e a quantidade devolvida ao estoque */
  reverted?: boolean;
}

export interface Appointment {
  id: string;
  patientName: string;
  time: string;
  date: string;
  pharmacist: string;
  type: string;
  status: 'confirmado' | 'pendente' | 'cancelado' | 'concluido';
}

export interface InventoryItem {
  id: string;
  name: string;
  dosage: string;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
  status: StockStatus;
  expirationDate: string;
}

export interface Withdrawal {
  id: string;
  patientName: string;
  cpf: string;
  medicineName: string;
  quantity: number;
  date: string;
  dispensedBy: string;
  /** id do item de estoque afetado, usado para debitar a quantidade retirada */
  inventoryItemId?: string;
  notes?: string;
}

/** Calcula o status de estoque de um item a partir da quantidade, do mínimo e da validade. */
export function computeStockStatus(item: {
  stock: number;
  minStock: number;
  expirationDate?: string;
}): StockStatus {
  if (item.expirationDate) {
    const expires = new Date(item.expirationDate).getTime();
    if (!Number.isNaN(expires) && expires < Date.now()) return 'expired';
  }
  if (item.stock <= 0) return 'critical';
  if (item.stock <= item.minStock) return 'low';
  return 'ok';
}
