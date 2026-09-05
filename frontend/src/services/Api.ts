// IMPORTS LOCAIS
import apiClient from '@/lib/Axios';
import type {
  AuthUser,
  Medicine,
  Batch,
  Patient,
  User,
  Withdrawal,
  Disposal,
  Appointment,
  ScheduleSlot,
} from '@/lib/Types';

// INTERFACE PARA LOGS DE ATIVIDADE
export interface ActivityLogEntry {
  id: number;
  userId: number;
  action: string;
  entity: string;
  entityId?: number | null;
  details?: string | null;
  createdAt: string;
  user?: { id: number; name: string; role: string };
}

// OBJETO PRINCIPAL DA API
export const api = {
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

  // Auth
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
    updateProfile: async (data: { currentPassword?: string; newPassword?: string; name?: string; phone?: string }) => {
      const response = await apiClient.put<{ message: string }>('/api/auth/profile', data);
      const result = response.data;
      return result;
    },
  },

  // Medicines
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

  // Batches
  batches: {
    getAll: async (medicineId?: number) => {
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
    }) => {
      const response = await apiClient.post<Batch>('/api/batches', data);
      const result = response.data;
      return result;
    },
    update: async (
      id: number,
      data: { batchNumber?: string; currentQuantity?: number; expirationDate?: string }
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

  // Appointments
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
      const response = await apiClient.put<Appointment>(`/api/appointments/${id}/status`, { status, notes });
      const result = response.data;
      return result;
    },
    cancel: async (id: number) => {
      const response = await apiClient.delete<Appointment>(`/api/appointments/${id}`);
      const result = response.data;
      return result;
    },
  },

  // Patients
  patients: {
    getAll: async (search?: string) => {
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

  // Schedule Slots
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
    delete: async (id: number) => {
      const response = await apiClient.delete<{ message: string }>(`/api/schedule-slots/${id}`);
      const result = response.data;
      return result;
    },
  },

  // Withdrawals
  withdrawals: {
    getAll: async () => {
      const response = await apiClient.get<Withdrawal[]>('/api/withdrawals');
      const result = response.data;
      return result;
    },
    create: async (data: {
      patientName: string;
      patientCpf: string;
      batchId: number;
      quantity: number;
      notes?: string;
    }) => {
      const response = await apiClient.post<{ message: string; withdrawal: Withdrawal }>('/api/withdrawals', data);
      const result = response.data;
      return result;
    },
    cancel: async (id: number) => {
      const response = await apiClient.delete<{ message: string }>(`/api/withdrawals/${id}`);
      const result = response.data;
      return result;
    },
  },

  // Disposals
  disposals: {
    getAll: async () => {
      const response = await apiClient.get<Disposal[]>('/api/disposals');
      const result = response.data;
      return result;
    },
    create: async (data: { batchId: number; quantity: number; reason: string }) => {
      const response = await apiClient.post<{ message: string; disposal: Disposal }>('/api/disposals', data);
      const result = response.data;
      return result;
    },
    revert: async (id: number) => {
      const response = await apiClient.post<{ message: string }>(`/api/disposals/${id}/revert`);
      const result = response.data;
      return result;
    },
  },

  // Users
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

  // Activity Logs
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