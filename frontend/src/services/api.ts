import apiClient from '@/lib/axios';
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
} from '@/lib/types';

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

export const api = {
  // Auth
  auth: {
    login: async (email: string, password: string) => {
      const res = await apiClient.post<{ token: string; user: AuthUser }>('/api/auth/login', {
        email,
        password,
      });
      return res.data;
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
      const res = await apiClient.post<{ token: string; user: AuthUser }>('/api/auth/register', data);
      return res.data;
    },
    me: async () => {
      const res = await apiClient.get<AuthUser>('/api/auth/me');
      return res.data;
    },
    updateProfile: async (data: { currentPassword?: string; newPassword?: string; name?: string; phone?: string }) => {
      const res = await apiClient.put<{ message: string }>('/api/auth/profile', data);
      return res.data;
    },
  },

  // Medicines
  medicines: {
    getAll: async () => {
      const res = await apiClient.get<Medicine[]>('/api/medicines');
      return res.data;
    },
    getById: async (id: number) => {
      const res = await apiClient.get<Medicine & { batches?: Batch[] }>(`/api/medicines/${id}`);
      return res.data;
    },
    create: async (data: {
      name: string;
      activeIngredient?: string;
      dosage?: string;
      accessibleDesc?: string;
      category?: string;
    }) => {
      const res = await apiClient.post<Medicine>('/api/medicines', data);
      return res.data;
    },
    update: async (id: number, data: Partial<Medicine>) => {
      const res = await apiClient.put<Medicine>(`/api/medicines/${id}`, data);
      return res.data;
    },
    delete: async (id: number) => {
      const res = await apiClient.delete<{ message: string }>(`/api/medicines/${id}`);
      return res.data;
    },
  },

  // Batches
  batches: {
    getAll: async (medicineId?: number) => {
      const res = await apiClient.get<Batch[]>('/api/batches', {
        params: medicineId ? { medicineId } : undefined,
      });
      return res.data;
    },
    create: async (data: {
      medicineId: number;
      batchNumber: string;
      currentQuantity: number;
      expirationDate: string;
    }) => {
      const res = await apiClient.post<Batch>('/api/batches', data);
      return res.data;
    },
    update: async (
      id: number,
      data: { batchNumber?: string; currentQuantity?: number; expirationDate?: string }
    ) => {
      const res = await apiClient.put<Batch>(`/api/batches/${id}`, data);
      return res.data;
    },
    delete: async (id: number) => {
      const res = await apiClient.delete<{ message: string }>(`/api/batches/${id}`);
      return res.data;
    },
  },

  // Appointments
  appointments: {
    getAll: async () => {
      const res = await apiClient.get<Appointment[]>('/api/appointments');
      return res.data;
    },
    getById: async (id: number) => {
      const res = await apiClient.get<Appointment>(`/api/appointments/${id}`);
      return res.data;
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
      const res = await apiClient.post<Appointment>('/api/appointments', data);
      return res.data;
    },
    updateStatus: async (id: number, status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED', notes?: string) => {
      const res = await apiClient.put<Appointment>(`/api/appointments/${id}`, { status, notes });
      return res.data;
    },
    cancel: async (id: number) => {
      const res = await apiClient.delete<Appointment>(`/api/appointments/${id}`);
      return res.data;
    },
  },

  // Patients
  patients: {
    getAll: async (search?: string) => {
      const res = await apiClient.get<Patient[]>('/api/patients', {
        params: search ? { search } : undefined,
      });
      return res.data;
    },
    getById: async (id: number) => {
      const res = await apiClient.get<Patient>(`/api/patients/${id}`);
      return res.data;
    },
    create: async (data: Partial<Patient>) => {
      const res = await apiClient.post<Patient>('/api/patients', data);
      return res.data;
    },
    update: async (id: number, data: Partial<Patient>) => {
      const res = await apiClient.put<Patient>(`/api/patients/${id}`, data);
      return res.data;
    },
    delete: async (id: number) => {
      const res = await apiClient.delete<{ message: string }>(`/api/patients/${id}`);
      return res.data;
    },
  },

  // Schedule Slots
  scheduleSlots: {
    getAll: async (params?: { startDate?: string; endDate?: string }) => {
      const res = await apiClient.get<ScheduleSlot[]>('/api/schedule-slots', { params });
      return res.data;
    },
    create: async (data: { date: string; timeSlot: string; maxCapacity?: number; assignedToId?: number }) => {
      const res = await apiClient.post<ScheduleSlot>('/api/schedule-slots', data);
      return res.data;
    },
    delete: async (id: number) => {
      const res = await apiClient.delete<{ message: string }>(`/api/schedule-slots/${id}`);
      return res.data;
    },
  },

  // Withdrawals
  withdrawals: {
    getAll: async () => {
      const res = await apiClient.get<Withdrawal[]>('/api/withdrawals');
      return res.data;
    },
    create: async (data: {
      patientName: string;
      patientCpf: string;
      batchId: number;
      quantity: number;
      notes?: string;
    }) => {
      const res = await apiClient.post<{ message: string; withdrawal: Withdrawal }>('/api/withdrawals', data);
      return res.data;
    },
    cancel: async (id: number) => {
      const res = await apiClient.delete<{ message: string }>(`/api/withdrawals/${id}`);
      return res.data;
    },
  },

  // Disposals
  disposals: {
    getAll: async () => {
      const res = await apiClient.get<Disposal[]>('/api/disposals');
      return res.data;
    },
    create: async (data: { batchId: number; quantity: number; reason: string }) => {
      const res = await apiClient.post<{ message: string; disposal: Disposal }>('/api/disposals', data);
      return res.data;
    },
    revert: async (id: number) => {
      const res = await apiClient.post<{ message: string }>(`/api/disposals/${id}/revert`);
      return res.data;
    },
  },

  // Users
  users: {
    getAll: async () => {
      const res = await apiClient.get<User[]>('/api/users');
      return res.data;
    },
    create: async (data: Partial<User> & { password?: string }) => {
      const res = await apiClient.post<User>('/api/users', data);
      return res.data;
    },
    update: async (id: number, data: Partial<User>) => {
      const res = await apiClient.put<User>(`/api/users/${id}`, data);
      return res.data;
    },
    delete: async (id: number) => {
      const res = await apiClient.delete<{ message: string }>(`/api/users/${id}`);
      return res.data;
    },
  },

  // Activity Logs
  activityLogs: {
    getAll: async (params?: { userId?: number; entity?: string; page?: number; limit?: number }) => {
      const res = await apiClient.get<{
        logs: ActivityLogEntry[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>('/api/activity-logs', { params });
      return res.data;
    },
  },
};

export default api;
