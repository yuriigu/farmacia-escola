// Types matching the corrected API responses

export type Role = 'ADMIN' | 'FARMACEUTICO' | 'MEDICO' | 'ALUNO' | 'PACIENTE' | 'ATENDENTE';
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
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

export interface Patient {
  id: number;
  name: string;
  cpf: string;
  susCard?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  address?: string | null;
  createdAt?: string;
  updatedAt?: string;
  userId?: number | null;
  withdrawalsCount?: number;
  appointmentsCount?: number;
  _count?: {
    withdrawals?: number;
    appointments?: number;
  };
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  registerDoc?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  address?: string | null;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  permissions?: Record<string, boolean> | null;
  patient?: {
    id?: number;
    cpf?: string | null;
    birthDate?: string | null;
    address?: string | null;
    phone?: string | null;
  } | null;
}

// Withdrawal matches the formatWithdrawals output from backend
export interface Withdrawal {
  id: number;
  createdAt: string;
  date?: string;
  status?: string;
  cancelReason?: string | null;
  quantity: number;
  notes?: string | null;
  allocatedItems?: Array<{
    batchId: number;
    batchNumber: string;
    quantity: number;
  }>;
  patient: {
    name: string;
    cpf: string;
  };
  batch: {
    id: number;
    medicineId: number;
    batchNumber: string;
    code: string;
    currentQuantity: number;
    expirationDate: string;
    medicine: {
      name: string;
      dosage: string;
    };
  };
  user: {
    name: string;
  };
}

// Disposal matches the formatDisposals output from backend
export interface Disposal {
  id: number;
  createdAt: string;
  date?: string;
  quantity: number;
  reason: string;
  notes?: string | null;
  status: 'DISPOSED' | 'REVERTED' | string;
  revertReason?: string | null;
  reverted?: boolean;
  batch: {
    id: number;
    batchNumber: string;
    code: string;
    expirationDate: string;
    expiresAt: string;
    medicine: {
      id?: number;
      name: string;
      dosage?: string | null;
    };
  };
  user: {
    name: string;
  };
}

// ScheduleSlot — new model for time-slot scheduling
export interface ScheduleSlot {
  id: number;
  date: string;
  timeSlot: string;
  maxCapacity: number;
  active: boolean;
  assignedToId?: number | null;
  assignedTo?: { id: number; name: string; role: string } | null;
  createdAt?: string;
  _count?: { appointments: number };
}

// AppointmentItem — medicines linked to an appointment
export interface AppointmentItem {
  id: number;
  appointmentId: number;
  medicineId: number;
  batchId?: number | null;
  quantity: number;
  medicine?: {
    id: number;
    name: string;
    dosage?: string | null;
    activeIngredient?: string | null;
  };
  batch?: {
    id: number;
    batchNumber: string;
    currentQuantity: number;
    expirationDate: string;
  };
}

export interface Appointment {
  id: number;
  patientId: number;
  scheduledDate: string;
  scheduledTime?: string | null;
  slotId?: number | null;
  status: AppointmentStatus;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  patient?: {
    id: number;
    name: string;
    cpf?: string | null;
    phone?: string | null;
  };
  slot?: ScheduleSlot | null;
  items?: AppointmentItem[];
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  active?: boolean;
  patientId?: number | null;
  permissions?: Record<string, boolean>;
}

// Draft types for forms
export interface BatchEntryDraft {
  medicineId: number;
  batchNumber: string;
  currentQuantity: number;
  expirationDate: string;
  manufacturingDate?: string;
  supplier: string;
}

export interface WithdrawalDraft {
  patientId?: number;
  patientName: string;
  patientCpf: string;
  medicineId?: number;
  batchId: number;
  quantity: number;
  appointmentId?: number;
  notes: string;
}

export interface DisposalDraft {
  batchId: number;
  quantity: number;
  reason: string;
  notes?: string;
}

export interface AppointmentItemDraft {
  medicineId: number;
  quantity: number;
}

export interface AppointmentDraft {
  scheduledDate: string;
  scheduledTime?: string;
  slotId?: number;
  patientId?: number;
  notes?: string;
  items: AppointmentItemDraft[];
}

// FUNCAO PARA CALCULAR O STATUS DO ESTOQUE
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