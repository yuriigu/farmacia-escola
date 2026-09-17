import type { Batch } from './stock';

// STATUS DO CICLO DE VIDA DO AGENDAMENTO
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

// FAIXA HORARIA DE AGENDAMENTO
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

// ITEM DE MEDICAMENTO VINCULADO AO AGENDAMENTO
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

// AGENDAMENTO DE RETIRADA
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
  batchId?: number | null;
  batch?: Batch | null;
  dispensedByUserId?: number | null;
  dispensedAt?: string | null;
  dispensedByUser?: {
    id: number;
    name: string;
    role: string;
  } | null;
}

// RASCUNHOS DE AGENDAMENTO (FORMULARIOS)
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