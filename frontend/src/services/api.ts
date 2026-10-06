// imports locais
import apiClient from '@/lib/axios';
import type {
  AuthUser,
  Medicine,
  Batch,
  Patient,
  User,
  Disposal,
  Appointment,
  ScheduleSlot,
  ActivityLogEntry,
} from '@/types';

// objeto principal do cliente http do app. organiza as chamadas
// em tres camadas:
// 1) helpers genericos (get/post/put/patch/delete) que ja prefixam
//    /api quando o caminho nao veio com o prefixo.
// 2) recursos agrupados por dominio (auth, medicines, batches, ...)
//    cada um com seus metodos semanticos.
// todas as chamadas usam o apiClient (/lib/axios), que cuida do
// token e da normalizacao de erro.
// retorno: as funcoes devolvem response.data direto (nao o response
// completo do axios), pra quem consome so precisar do dado.
export const api = {
  // helpers genericos. aceitam tanto "/medicines" quanto "/api/medicines":
  // a checagem do prefixo evita duplicar /api/api.
  get: async <T>(url: string, config?: any) => {
    let finalUrl = `/api${url}`;
    if (url.startsWith('/api')) {
      finalUrl = url;
    } else {
      finalUrl = `/api${url}`;
    }
    const response = await apiClient.get<T>(finalUrl, config);
    const result = response.data;
    return result;
  },
  post: async <T>(url: string, data?: any, config?: any) => {
    let finalUrl = `/api${url}`;
    if (url.startsWith('/api')) {
      finalUrl = url;
    } else {
      finalUrl = `/api${url}`;
    }
    const response = await apiClient.post<T>(finalUrl, data, config);
    const result = response.data;
    return result;
  },
  put: async <T>(url: string, data?: any, config?: any) => {
    let finalUrl = `/api${url}`;
    if (url.startsWith('/api')) {
      finalUrl = url;
    } else {
      finalUrl = `/api${url}`;
    }
    const response = await apiClient.put<T>(finalUrl, data, config);
    const result = response.data;
    return result;
  },
  patch: async <T>(url: string, data?: any, config?: any) => {
    let finalUrl = `/api${url}`;
    if (url.startsWith('/api')) {
      finalUrl = url;
    } else {
      finalUrl = `/api${url}`;
    }
    const response = await apiClient.patch<T>(finalUrl, data, config);
    const result = response.data;
    return result;
  },
  delete: async <T>(url: string, config?: any) => {
    let finalUrl = `/api${url}`;
    if (url.startsWith('/api')) {
      finalUrl = url;
    } else {
      finalUrl = `/api${url}`;
    }
    const response = await apiClient.delete<T>(finalUrl, config);
    const result = response.data;
    return result;
  },

  // auth: login, cadastro publico de paciente, leitura do proprio
  // perfil e atualizacao de senha/perfil.
  auth: {
    login: async (email: string, password: string) => {
      const response = await apiClient.post<{ token: string; user: AuthUser }>('/api/auth/login', {
        email,
        password,
      });
      const result = response.data;
      return result;
    },
    register: async (data: {
      name: string;
      email: string;
      password: string;
      cpf: string;
      phone?: string;
      birthDate?: string;
      address?: string;
    }) => {
      const response = await apiClient.post<{ token: string; user: AuthUser }>('/api/auth/register', data);
      const result = response.data;
      return result;
    },
    me: async () => {
      const response = await apiClient.get<AuthUser>('/api/auth/me');
      const result = response.data;
      return result;
    },
    updateProfile: async (data: { currentPassword?: string; newPassword?: string; name?: string; email?: string; phone?: string; address?: string }): Promise<{ message: string; user: AuthUser }> => {
      const response = await apiClient.put<{ message: string; user: AuthUser }>('/api/auth/profile', data);
      const result = response.data;
      return result;
    },
  },

  // medicines: crud do catalogo de medicamentos.
  medicines: {
    getAll: async () => {
      const response = await apiClient.get<Medicine[]>('/api/medicines');
      const result = response.data;
      return result;
    },
    getById: async (id: number) => {
      const response = await apiClient.get<Medicine & { batches?: Batch[] }>(`/api/medicines/${id}`);
      const result = response.data;
      return result;
    },
    create: async (data: {
      name: string;
      activeIngredient?: string;
      dosage?: string;
      dosageValue?: number | null;
      dosageUnit?: string | null;
      minQuantity?: number;
      accessibleDesc?: string;
      category?: string;
    }) => {
      const response = await apiClient.post<Medicine>('/api/medicines', data);
      const result = response.data;
      return result;
    },
    update: async (id: number, data: Partial<Medicine>) => {
      const response = await apiClient.put<Medicine>(`/api/medicines/${id}`, data);
      const result = response.data;
      return result;
    },
    delete: async (id: number) => {
      const response = await apiClient.delete<{ message: string }>(`/api/medicines/${id}`);
      const result = response.data;
      return result;
    },
  },

  // batches: crud de lotes + as duas operacoes auditadas (block
  // e adjust), que seguem endpoints dedicados no backend.
  batches: {
    getAll: async (medicineId?: number) => {
      // filtro opcional por medicamento: so manda o param quando
      // o id foi passado.
      let requestParams;

      if (medicineId) {
        requestParams = { medicineId };
      } else {
        requestParams = undefined;
      }

      const response = await apiClient.get<Batch[]>('/api/batches', {
        params: requestParams,
      });
      const result = response.data;
      return result;
    },
    create: async (data: {
      medicineId: number;
      batchNumber: string;
      currentQuantity: number;
      expirationDate: string;
      manufacturingDate?: string | null;
      supplier?: string;
      isBlocked?: boolean;
      blockReason?: string | null;
    }) => {
      const response = await apiClient.post<Batch>('/api/batches', data);
      const result = response.data;
      return result;
    },
    // alterna o bloqueio sanitario do lote. e um endpoint auditado,
    // entao exige motivo quando esta bloqueando.
    block: async (id: number, data: { isBlocked: boolean; blockReason?: string | null }) => {
      const response = await apiClient.patch<Batch>('/api/batches/' + id + '/block', data);
      const result = response.data;
      return result;
    },
    // ajuste auditado de saldo. mesmo esquema: exige justificativa.
    adjust: async (id: number, data: { newQuantity: number; reason: string }) => {
      const response = await apiClient.post<Batch>('/api/batches/' + id + '/adjustments', data);
      const result = response.data;
      return result;
    },
    update: async (
      id: number,
      data: { batchNumber?: string; currentQuantity?: number; expirationDate?: string; supplier?: string; manufacturingDate?: string | null }
    ) => {
      const response = await apiClient.put<Batch>(`/api/batches/${id}`, data);
      const result = response.data;
      return result;
    },
    delete: async (id: number) => {
      const response = await apiClient.delete<{ message: string }>(`/api/batches/${id}`);
      const result = response.data;
      return result;
    },
  },

  // appointments: crud de agendamento + transicoes de status
  // (updatestatus/cancel) + os fluxos de dispensacao e estorno.
  appointments: {
    getAll: async () => {
      const response = await apiClient.get<Appointment[]>('/api/appointments');
      const result = response.data;
      return result;
    },
    getById: async (id: number) => {
      const response = await apiClient.get<Appointment>(`/api/appointments/${id}`);
      const result = response.data;
      return result;
    },
    create: async (data: {
      items: Array<{ medicineId: number; quantity: number }>;
      scheduledDate: string;
      scheduledTime?: string;
      slotId?: number;
      patientId?: number;
      notes?: string;
      patientName?: string;
      patientCpf?: string;
    }) => {
      const response = await apiClient.post<Appointment>('/api/appointments', data);
      const result = response.data;
      return result;
    },
    updateStatus: async (id: number, status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED', notes?: string) => {
      // monta o payload so com o status e, se veio, as notes.
      // a distincao undefined/null importa aqui: so manda notes
      // quando ela existe de fato.
      const payload: { status: string; notes?: string } = { status };
      if (notes !== undefined && notes !== null) {
        payload.notes = notes;
      }
      const response = await apiClient.put<Appointment>(`/api/appointments/${id}/status`, payload);
      const result = response.data;
      return result;
    },
    // cancelamento: usa o mesmo endpoint de status, forcando
    // cancelled + notas (a justificativa do cancelamento).
    cancel: async (id: number, cancelReason: string) => {
      const response = await apiClient.put<Appointment>(`/api/appointments/${id}/status`, { status: 'CANCELLED', notes: cancelReason });
      const result = response.data;
      return result;
    },
    dispense: async (id: number, data: { batchSelections?: Array<{ medicineId: number; batchId: number; quantity: number }>; notes?: string }) => {
      const response = await apiClient.post<Appointment>(`/api/appointments/${id}/dispense`, data);
      const result = response.data;
      return result;
    },
    revertDispense: async (id: number, reason: string) => {
      const response = await apiClient.post<Appointment>(`/api/appointments/${id}/revert-dispense`, { reason });
      const result = response.data;
      return result;
    },
  },

  // patients: crud de pacientes + busca por termo.
  patients: {
    getAll: async (search?: string) => {
      // filtro opcional por busca: so manda o param quando veio
      // algum termo.
      let requestParams: { search: string } | undefined = undefined;
      if (search) {
        requestParams = { search: search };
      } else {
        requestParams = undefined;
      }
      const response = await apiClient.get<Patient[]>('/api/patients', {
        params: requestParams,
      });
      const result = response.data;
      return result;
    },
    getById: async (id: number) => {
      const response = await apiClient.get<Patient>(`/api/patients/${id}`);
      const result = response.data;
      return result;
    },
    create: async (data: Partial<Patient>) => {
      const response = await apiClient.post<Patient>('/api/patients', data);
      const result = response.data;
      return result;
    },
    update: async (id: number, data: Partial<Patient>) => {
      const response = await apiClient.put<Patient>(`/api/patients/${id}`, data);
      const result = response.data;
      return result;
    },
    delete: async (id: number) => {
      const response = await apiClient.delete<{ message: string }>(`/api/patients/${id}`);
      const result = response.data;
      return result;
    },
  },

  // scheduleslots: crud de escala de atendimento.
  scheduleSlots: {
    getAll: async (params?: { startDate?: string; endDate?: string }) => {
      const response = await apiClient.get<ScheduleSlot[]>('/api/schedule-slots', { params });
      const result = response.data;
      return result;
    },
    create: async (data: { date: string; timeSlot: string; maxCapacity?: number; assignedToId?: number }) => {
      const response = await apiClient.post<ScheduleSlot>('/api/schedule-slots', data);
      const result = response.data;
      return result;
    },
    update: async (id: number, data: {
      date?: string;
      timeSlot?: string;
      maxCapacity?: number;
      assignedToId?: number | null;
      active?: boolean;
    }) => {
      const response = await apiClient.put<ScheduleSlot>(`/api/schedule-slots/${id}`, data);
      const result = response.data;
      return result;
    },
    delete: async (id: number) => {
      const response = await apiClient.delete<{ message: string }>(`/api/schedule-slots/${id}`);
      const result = response.data;
      return result;
    },
  },

  // disposals: listar, criar e reverter descartes. a reversao
  // exige motivo no backend.
  disposals: {
    getAll: async () => {
      const response = await apiClient.get<Disposal[]>('/api/disposals');
      const result = response.data;
      return result;
    },
    create: async (data: { batchId: number; quantity: number; reason: string; notes?: string }) => {
      const response = await apiClient.post<Disposal>('/api/disposals', data);
      const result = response.data;
      return result;
    },
    revert: async (id: number, revertReason: string) => {
      const response = await apiClient.post<Disposal>(`/api/disposals/${id}/revert`, { revertReason });
      const result = response.data;
      return result;
    },
  },

  // users: crud de usuarios (gestao de contas).
  users: {
    getAll: async () => {
      const response = await apiClient.get<User[]>('/api/users');
      const result = response.data;
      return result;
    },
    create: async (data: Partial<User> & { password?: string }) => {
      const response = await apiClient.post<User>('/api/users', data);
      const result = response.data;
      return result;
    },
    update: async (id: number, data: Partial<User>) => {
      const response = await apiClient.put<User>(`/api/users/${id}`, data);
      const result = response.data;
      return result;
    },
    delete: async (id: number) => {
      const response = await apiClient.delete<{ message: string }>(`/api/users/${id}`);
      const result = response.data;
      return result;
    },
  },

  // activitylogs: leitura dos logs de auditoria com filtros e
  // paginacao. o retorno ja traz logs + info de paginacao prontos.
  activityLogs: {
    getAll: async (params?: { userId?: number; entity?: string; page?: number; limit?: number }) => {
      const response = await apiClient.get<{
        logs: ActivityLogEntry[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>('/api/activity-logs', { params });
      const result = response.data;
      return result;
    },
  },
};