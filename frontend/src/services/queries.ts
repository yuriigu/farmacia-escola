// imports do react e bibliotecas
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast-handler';
import { useAuthStore } from '@/lib/auth-store';

// imports locais
import { api } from './api';
import type { StockStatusSummary, AppointmentStatus } from '@/types';



// chaves de consulta centralizadas do react-query. ficam todas
// aqui pra facilitar a invalidacao (mutations invalidam a mesma
// chave que os hooks de leitura usam) e evitar typo em string.
// algumas aceitam parametro (ex: batches(medicineid) e patients(search))
// pra cada conjunto de filtro ter seu proprio cache.
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


// medicines

// lista o catalogo de medicamentos. staletime de 5 min porque o
// catalogo muda pouco e evita refetch a cada montagem de tela.
export function useMedicines(options: { enabled?: boolean } = {}) {
  const role = useAuthStore((state) => state.user?.role);
  return useQuery({
    queryKey: [...QUERY_KEYS.medicines, role],
    queryFn: () => {
      return api.medicines.getAll();
    },
    enabled: options.enabled ?? true,
    staleTime: 1000 * 60 * 5,
  });
}

// busca um medicamento por id. so dispara quando o id e um numero
// valido (> 0), por causa do enabled. util pra modais que abrem
// com id opcional.
export function useMedicine(id: number | null | undefined) {
  const role = useAuthStore((state) => state.user?.role);
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
    queryKey: [...QUERY_KEYS.medicine(medicineId), role],
    queryFn: () => {
      return api.medicines.getById(id!);
    },
    enabled: isEnabled,
  });
}

// cria medicamento. invalida a lista no sucesso. erros vem do
// apiclient ja normalizados (err.message tem a mensagem certa).
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

// batches (estoque)

// lista os lotes, com filtro opcional por medicamento.
export function useBatches(medicineId?: number, options: { enabled?: boolean } = {}) {
  const role = useAuthStore((state) => state.user?.role);
  return useQuery({
    queryKey: [...QUERY_KEYS.batches(medicineId), role],
    queryFn: () => {
      return api.batches.getAll(medicineId);
    },
    enabled: options.enabled ?? true,
  });
}

// panorama do estoque consolidado pelo backend (get /api/dashboard/stock-status).
// staletime de 5 min porque e um agregado barato no backend mas
// usado em toda tela de dashboard.
export function useStockStatus(options: { enabled?: boolean } = {}) {
  const role = useAuthStore((state) => state.user?.role);
  return useQuery({
    queryKey: [...QUERY_KEYS.stockStatus, role],
    queryFn: () => {
      return api.get<StockStatusSummary>('/dashboard/stock-status');
    },
    enabled: options.enabled ?? true,
    staleTime: 1000 * 60 * 5,
  });
}


// cria lote. invalida tanto a lista de lotes quanto a de
// medicamentos, porque o saldo do catalogo muda junto.
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

// remove lote. mesma invalidacao dupla (batches + medicines),
// pelo mesmo motivo do create.
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

// appointments

// lista os agendamentos. staletime mais curto (60s) porque isso
// muda com frequencia, mas com refetchonmount desligado no provider
// a tela nao refaz a chamada so por remontar.
export function useAppointments() {
  return useQuery({
    queryKey: QUERY_KEYS.appointments,
    queryFn: () => {
      return api.appointments.getAll();
    },
    staleTime: 1000 * 60,
  });
}

// busca agendamento por id. so dispara quando o id e um numero
// valido (> 0).
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

// cria agendamento. invalida a lista de agendamentos no sucesso.
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

// atualiza o status do agendamento (pending, confirmed, completed,
// cancelled). aceita notes opcional pra casos como cancelamento.
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

// cancela um agendamento. usa o endpoint de status com cancelled
// + justificativa (o backend exige motivo).
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

// patients

// lista pacientes. o placeholderdata keep-previous junto do
// staletime de 2 min evita o "piscar" da lista a cada keystroke
// do autocomplete de cpf (que dispara a cada 3 digitos).
export function usePatients(search?: string, options: { enabled?: boolean } = {}) {
  const user = useAuthStore((state) => state.user);
  const role = user?.role?.toUpperCase();
  const canReadPatients = ['ADMIN', 'FARMACEUTICO', 'ALUNO', 'MEDICO'].includes(role ?? '');
  return useQuery({
    queryKey: QUERY_KEYS.patients(search),
    queryFn: () => {
      return api.patients.getAll(search);
    },
    enabled: canReadPatients && (options.enabled ?? true),
    staleTime: 1000 * 60 * 2,
    placeholderData: (previousData) => previousData,
  });
}

// busca paciente por id. so dispara quando o id e um numero
// valido (> 0).
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