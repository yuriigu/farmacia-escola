import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type {
  Medicine,
  Batch,
  Patient,
  Appointment,
  ScheduleSlot,
  Withdrawal,
  Disposal,
  User,
} from '@/lib/types';
import { toast } from 'sonner';

// Query Keys
export const QUERY_KEYS = {
  medicines: ['medicines'] as const,
  medicine: (id: number) => ['medicines', id] as const,
  batches: (medicineId?: number) => ['batches', medicineId] as const,
  appointments: ['appointments'] as const,
  appointment: (id: number) => ['appointments', id] as const,
  patients: (search?: string) => ['patients', search] as const,
  scheduleSlots: (params?: { startDate?: string; endDate?: string }) => ['scheduleSlots', params] as const,
  withdrawals: ['withdrawals'] as const,
  disposals: ['disposals'] as const,
  users: ['users'] as const,
  activityLogs: (params?: Record<string, unknown>) => ['activityLogs', params] as const,
  me: ['auth', 'me'] as const,
};

// ==================== MEDICINES ====================

export function useMedicines() {
  return useQuery({
    queryKey: QUERY_KEYS.medicines,
    queryFn: () => api.medicines.getAll(),
  });
}

export function useMedicine(id: number | null | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.medicine(id || 0),
    queryFn: () => api.medicines.getById(id!),
    enabled: Boolean(id && id > 0),
  });
}

export function useCreateMedicine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.medicines.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.medicines });
      toast.success('Medicamento cadastrado com sucesso!');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao cadastrar medicamento.');
    },
  });
}

// ==================== BATCHES (ESTOQUE) ====================

export function useBatches(medicineId?: number) {
  return useQuery({
    queryKey: QUERY_KEYS.batches(medicineId),
    queryFn: () => api.batches.getAll(medicineId),
  });
}

export function useCreateBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.batches.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.medicines });
      toast.success('Lote cadastrado com sucesso!');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao cadastrar lote.');
    },
  });
}

export function useDeleteBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.batches.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.medicines });
      toast.success('Lote removido com sucesso!');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao remover lote.');
    },
  });
}

// ==================== APPOINTMENTS ====================

export function useAppointments() {
  return useQuery({
    queryKey: QUERY_KEYS.appointments,
    queryFn: () => api.appointments.getAll(),
  });
}

export function useAppointment(id: number | null | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.appointment(id || 0),
    queryFn: () => api.appointments.getById(id!),
    enabled: Boolean(id && id > 0),
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.appointments.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.appointments });
      toast.success('Agendamento realizado com sucesso!');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao realizar agendamento.');
    },
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      notes,
    }: {
      id: number;
      status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
      notes?: string;
    }) => api.appointments.updateStatus(id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.appointments });
      toast.success('Status do agendamento atualizado!');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao atualizar agendamento.');
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.appointments.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.appointments });
      toast.success('Agendamento cancelado com sucesso.');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao cancelar agendamento.');
    },
  });
}

// ==================== PATIENTS ====================

export function usePatients(search?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.patients(search),
    queryFn: () => api.patients.getAll(search),
  });
}

export function usePatient(id: number | null | undefined) {
  return useQuery({
    queryKey: ['patients', id || 0],
    queryFn: () => api.patients.getById(id!),
    enabled: Boolean(id && id > 0),
  });
}