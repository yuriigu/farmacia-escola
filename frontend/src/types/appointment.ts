import type { Batch } from './stock';

// status possiveis do ciclo de vida do agendamento.
// pending aguarda confirmacao, confirmed ja reservou a vaga,
// completed foi atendido/dispensado e cancelled foi cancelado.
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

// faixa horaria de agendamento (slot da escala).
// representa um horario com data, capacidade maxima e um
// responsavel opcional. o _count traz quantos agendamentos ativos
// estao vinculados, pra calcular vagas livres na tela.
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

// item de medicamento vinculado a um agendamento.
// cada item aponta pro medicamento, pra quantidade solicitada e,
// quando a dispensacao acontece, pro lote escolhido (batchid).
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

// agendamento de retirada (consulta).
// alem dos campos principais (data, status, notas), traz os
// relacionamentos resolvidos pela api: paciente, slot, itens,
// lote de referencia e quem dispensou (dispensedbyuser).
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

// rascunhos de agendamento usados nos formularios da tela.
// sao versoes mais enxutas dos tipos finais, com so o que o
// usuario preenche antes de mandar pra api.
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