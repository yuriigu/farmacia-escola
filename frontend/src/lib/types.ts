// Types matching the corrected API responses

export type Role = 'ADMIN' | 'FARMACEUTICO' | 'MEDICO' | 'ALUNO' | 'PACIENTE';
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export type StockStatus = 'ok' | 'low' | 'critical' | 'expired';

export interface Medicine {
  id: number;
  name: string;
  activeIngredient: string;
  dosage: string;
  accessibleDesc: string;
  category?: string | null;
  totalQuantity: number;
  batchesCount: number;
  createdAt: string;
}

export interface Batch {
  id: number;
  medicineId: number;
  batchNumber: string;
  currentQuantity: number;
  expirationDate: string;
  receivedAt: string;
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
  phone?: string | null;
  birthDate?: string | null;
  address?: string | null;
  createdAt?: string;
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
  quantity: number;
  notes: string;
  patient: {
    name: string;
    cpf: string;
  };
  batch: {
    id: number;
    medicineId: number;
    code: string;
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
  quantity: number;
  reason: string;
  reverted: boolean;
  batch: {
    id: number;
    code: string;
    expiresAt: string;
    medicine: {
      name: string;
      dosage: string;
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
}

export interface WithdrawalDraft {
  patientName: string;
  patientCpf: string;
  batchId: number;
  quantity: number;
  notes: string;
}

export interface DisposalDraft {
  batchId: number;
  quantity: number;
  reason: string;
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

export function computeStockStatus(item: { totalQuantity?: number; expirationDate?: string; isExpired?: boolean }): StockStatus {
  if (item.isExpired) return 'expired';
  if (item.expirationDate) {
    const exp = new Date(item.expirationDate);
    if (!Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
      return 'expired';
    }
  }
  const qty = item.totalQuantity ?? 0;
  if (qty <= 0) return 'critical';
  if (qty <= 10) return 'low';
  return 'ok';
}