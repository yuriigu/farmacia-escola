// IMPORTS DO REACT E BIBLIOTECAS
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast-handler';

// IMPORTS LOCAIS
import { api } from './api';
import type { StockStatusSummary, AppointmentStatus } from '@/types';



// CHAVES DAS CONSULTAS DO REACT QUERY
export const QUERY_KEYS = {
  medicines: ['medicines'] as const,
  medicine: (id: number) => ['medicines', id] as const,
  batches: (medicineId?: number) => ['batches', medicineId] as const,
  appointments: ['appointments'] as const,
  appointment: (id: number) => ['appointments', id] as const,
  patients: (search?: string) => ['patients', search] as const,
  scheduleSlots: (params?: { startDate?: string; endDate?: string }) => ['scheduleSlots', params] as const,
  disposals: ['disposals'] as const,
  users: ['users'] as const,
  activityLogs: (params?: Record<string, unknown>) => ['activityLogs', params] as const,
  stockStatus: ['stockStatus'] as const,
  me: ['auth', 'me'] as const,
};


// ==================== MEDICINES ====================

// HOOK PARA LISTAR MEDICAMENTOS
// staleTime local de 5min: catálogo muda pouco; evita refetch a cada montagem.
export function useMedicines() {
  return useQuery({
    queryKey: QUERY_KEYS.medicines,
    queryFn: () => {
      return api.medicines.getAll();
    },
    staleTime: 1000 * 60 * 5,
  });
}

// HOOK PARA BUSCAR MEDICAMENTO POR ID
export function useMedicine(id: number | null | undefined) {
  let medicineId = 0;
  if (id) {
    medicineId = id;
  } else {
    medicineId = 0;
  }

  let isEnabled = false;
  if (id) {
    if (id > 0) {
      isEnabled = true;
    } else {
      isEnabled = false;
    }
  } else {
    isEnabled = false;
  }

  return useQuery({
    queryKey: QUERY_KEYS.medicine(medicineId),
    queryFn: () => {
      return api.medicines.getById(id!);
    },
    enabled: isEnabled,
  });
}

// HOOK PARA CRIAR MEDICAMENTO
export function useCreateMedicine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.medicines.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.medicines });
      toast.success('Medicamento cadastrado com sucesso!');
    },
    onError: (err: Error) => {
      let errorMessage = 'Erro ao cadastrar medicamento.';
      if (err.message) {
        errorMessage = err.message;
      } else {
        errorMessage = 'Erro ao cadastrar medicamento.';
      }
      toast.error(errorMessage);
    },
  });
}

// ==================== BATCHES (ESTOQUE) ====================

// HOOK PARA LISTAR LOTES
export function useBatches(medicineId?: number) {
  return useQuery({
    queryKey: QUERY_KEYS.batches(medicineId),
    queryFn: () => {
      return api.batches.getAll(medicineId);
    },
  });
}

// HOOK PARA O PANORAMA DE ESTOQUE CONSOLIDADO PELO BACKEND
// staleTime 5min: agregado barato no backend mas chamado em todo dashboard.
export function useStockStatus() {
  return useQuery({
    queryKey: QUERY_KEYS.stockStatus,
    queryFn: () => {
      return api.get<StockStatusSummary>('/dashboard/stock-status');
    },
    staleTime: 1000 * 60 * 5,
  });
}


// HOOK PARA CRIAR LOTE
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
      let errorMessage = 'Erro ao cadastrar lote.';
      if (err.message) {
        errorMessage = err.message;
      } else {
        errorMessage = 'Erro ao cadastrar lote.';
      }
      toast.error(errorMessage);
    },
  });
}

// HOOK PARA REMOVER LOTE
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
      let errorMessage = 'Erro ao remover lote.';
      if (err.message) {
        errorMessage = err.message;
      } else {
        errorMessage = 'Erro ao remover lote.';
      }
      toast.error(errorMessage);
    },
  });
}

// ==================== APPOINTMENTS ====================

// HOOK PARA LISTAR AGENDAMENTOS
// staleTime curto (60s): muda com frequência, mas sem refetch em cada remount.
export function useAppointments() {
  return useQuery({
    queryKey: QUERY_KEYS.appointments,
    queryFn: () => {
      return api.appointments.getAll();
    },
    staleTime: 1000 * 60,
  });
}

// HOOK PARA BUSCAR AGENDAMENTO POR ID
export function useAppointment(id: number | null | undefined) {
  let appointmentId = 0;
  if (id) {
    appointmentId = id;
  } else {
    appointmentId = 0;
  }

  let isEnabled = false;
  if (id) {
    if (id > 0) {
      isEnabled = true;
    } else {
      isEnabled = false;
    }
  } else {
    isEnabled = false;
  }

  return useQuery({
    queryKey: QUERY_KEYS.appointment(appointmentId),
    queryFn: () => {
      return api.appointments.getById(id!);
    },
    enabled: isEnabled,
  });
}

// HOOK PARA CRIAR AGENDAMENTO
export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.appointments.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.appointments });
      toast.success('Agendamento realizado com sucesso!');
    },
    onError: (err: Error) => {
      let errorMessage = 'Erro ao realizar agendamento.';
      if (err.message) {
        errorMessage = err.message;
      } else {
        errorMessage = 'Erro ao realizar agendamento.';
      }
      toast.error(errorMessage);
    },
  });
}

// HOOK PARA ATUALIZAR STATUS DE AGENDAMENTO
export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      notes,
    }: {
      id: number;
      status: AppointmentStatus;
      notes?: string;
    }) => {
      return api.appointments.updateStatus(id, status, notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.appointments });
      toast.success('Status do agendamento atualizado!');
    },
    onError: (err: Error) => {
      let errorMessage = 'Erro ao atualizar agendamento.';
      if (err.message) {
        errorMessage = err.message;
      } else {
        errorMessage = 'Erro ao atualizar agendamento.';
      }
      toast.error(errorMessage);
    },
  });
}

// HOOK PARA CANCELAR AGENDAMENTO
export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => api.appointments.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.appointments });
      toast.success('Agendamento cancelado com sucesso.');
    },
    onError: (err: Error) => {
      let errorMessage = 'Erro ao cancelar agendamento.';
      if (err.message) {
        errorMessage = err.message;
      } else {
        errorMessage = 'Erro ao cancelar agendamento.';
      }
      toast.error(errorMessage);
    },
  });
}

// ==================== PATIENTS ====================

// HOOK PARA LISTAR PACIENTES
// OTIMIZADO: placeholderData keepPreviousData + staleTime evitam refetch
// visual a cada keystroke do autocomplete de CPF (dispara a cada 3 dígitos).
export function usePatients(search?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.patients(search),
    queryFn: () => {
      return api.patients.getAll(search);
    },
    staleTime: 1000 * 60 * 2,
    placeholderData: (previousData) => previousData,
  });
}

// HOOK PARA BUSCAR PACIENTE POR ID
export function usePatient(id: number | null | undefined) {
  let patientId = 0;
  if (id) {
    patientId = id;
  } else {
    patientId = 0;
  }

  let isEnabled = false;
  if (id) {
    if (id > 0) {
      isEnabled = true;
    } else {
      isEnabled = false;
    }
  } else {
    isEnabled = false;
  }

  return useQuery({
    queryKey: ['patients', patientId],
    queryFn: () => {
      return api.patients.getById(id!);
    },
    enabled: isEnabled,
  });
}