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
      const res = await apiClient.post<{ token: string; user: AuthUser }>('/backend/auth/login', {
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
      const res = await apiClient.post<{ token: string; user: AuthUser }>('/backend/auth/register', data);
      return res.data;
    },
    me: async () => {
      const res = await apiClient.get<AuthUser>('/backend/auth/me');
      return res.data;
    },
    updateProfile: async (data: { currentPassword?: string; newPassword?: string; name?: string; phone?: string }) => {
      const res = await apiClient.put<{ message: string }>('/backend/auth/profile', data);
      return res.data;
    },
  },

  // Medicines
  medicines: {
    getAll: async () => {
      const res = await apiClient.get<Medicine[]>('/backend/medicines');
      return res.data;
    },
    getById: async (id: number) => {
      const res = await apiClient.get<Medicine & { batches?: Batch[] }>(`/backend/medicines/${id}`);
      return res.data;
    },
    create: async (data: {
      name: string;
      activeIngredient?: string;
      dosage?: string;
      accessibleDesc?: string;
      category?: string;
    }) => {
      const res = await apiClient.post<Medicine>('/backend/medicines', data);
      return res.data;
    },
    update: async (id: number, data: Partial<Medicine>) => {
      const res = await apiClient.put<Medicine>(`/backend/medicines/${id}`, data);
      return res.data;
    },
    delete: async (id: number) => {
      const res = await apiClient.delete<{ message: string }>(`/backend/medicines/${id}`);
      return res.data;
    },
  },

  // Batches
  batches: {
    getAll: async (medicineId?: number) => {
      const res = await apiClient.get<Batch[]>('/backend/batches', {
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
      const res = await apiClient.post<Batch>('/backend/batches', data);
      return res.data;
    },
    update: async (
      id: number,
      data: { batchNumber?: string; currentQuantity?: number; expirationDate?: string }
    ) => {
      const res = await apiClient.put<Batch>(`/backend/batches/${id}`, data);
      return res.data;
    },
    delete: async (id: number) => {
      const res = await apiClient.delete<{ message: string }>(`/backend/batches/${id}`);
      return res.data;
    },
  },

  // Appointments
  appointments: {
    getAll: async () => {
      const res = await apiClient.get<Appointment[]>('/backend/appointments');
      return res.data;
    },
    getById: async (id: number) => {
      const res = await apiClient.get<Appointment>(`/backend/appointments/${id}`);
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
      const res = await apiClient.post<Appointment>('/backend/appointments', data);
      return res.data;
    },
    updateStatus: async (id: number, status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED', notes?: string) => {
      const res = await apiClient.put<Appointment>(`/backend/appointments/${id}`, { status, notes });
      return res.data;
    },
    cancel: async (id: number) => {
      const res = await apiClient.delete<Appointment>(`/backend/appointments/${id}`);
      return res.data;
    },
  },

  // Patients
  patients: {
    getAll: async (search?: string) => {
      const res = await apiClient.get<Patient[]>('/backend/patients', {
        params: search ? { search } : undefined,
      });
      return res.data;
    },
    getById: async (id: number) => {
      const res = await apiClient.get<Patient>(`/backend/patients/${id}`);
      return res.data;
    },
    create: async (data: Partial<Patient>) => {
      const res = await apiClient.post<Patient>('/backend/patients', data);
      return res.data;
    },
    update: async (id: number, data: Partial<Patient>) => {
      const res = await apiClient.put<Patient>(`/backend/patients/${id}`, data);
      return res.data;
    },
    delete: async (id: number) => {
      const res = await apiClient.delete<{ message: string }>(`/backend/patients/${id}`);
      return res.data;
    },
  },

  // Schedule Slots
  scheduleSlots: {
    getAll: async (params?: { startDate?: string; endDate?: string }) => {
      const res = await apiClient.get<ScheduleSlot[]>('/backend/schedule-slots', { params });
      return res.data;
    },
    create: async (data: { date: string; timeSlot: string; maxCapacity?: number; assignedToId?: number }) => {
      const res = await apiClient.post<ScheduleSlot>('/backend/schedule-slots', data);
      return res.data;
    },
    delete: async (id: number) => {
      const res = await apiClient.delete<{ message: string }>(`/backend/schedule-slots/${id}`);
      return res.data;
    },
  },

  // Withdrawals
  withdrawals: {
    getAll: async () => {
      const res = await apiClient.get<Withdrawal[]>('/backend/withdrawals');
      return res.data;
    },
    create: async (data: {
      patientName: string;
      patientCpf: string;
      batchId: number;
      quantity: number;
      notes?: string;
    }) => {
      const res = await apiClient.post<{ message: string; withdrawal: Withdrawal }>('/backend/withdrawals', data);
      return res.data;
    },
    cancel: async (id: number) => {
      const res = await apiClient.delete<{ message: string }>(`/backend/withdrawals/${id}`);
      return res.data;
    },
  },

  // Disposals
  disposals: {
    getAll: async () => {
      const res = await apiClient.get<Disposal[]>('/backend/disposals');
      return res.data;
    },
    create: async (data: { batchId: number; quantity: number; reason: string }) => {
      const res = await apiClient.post<{ message: string; disposal: Disposal }>('/backend/disposals', data);
      return res.data;
    },
    revert: async (id: number) => {
      const res = await apiClient.post<{ message: string }>(`/backend/disposals/${id}/revert`);
      return res.data;
    },
  },

  // Users
  users: {
    getAll: async () => {
      const res = await apiClient.get<User[]>('/backend/users');
      return res.data;
    },
    create: async (data: Partial<User> & { password?: string }) => {
      const res = await apiClient.post<User>('/backend/users', data);
      return res.data;
    },
    update: async (id: number, data: Partial<User>) => {
      const res = await apiClient.put<User>(`/backend/users/${id}`, data);
      return res.data;
    },
    delete: async (id: number) => {
      const res = await apiClient.delete<{ message: string }>(`/backend/users/${id}`);
      return res.data;
    },
  },

  // Activity Logs
  activityLogs: {
    getAll: async (params?: { userId?: number; entity?: string; page?: number; limit?: number }) => {
      const res = await apiClient.get<{
        logs: ActivityLogEntry[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>('/backend/activity-logs', { params });
      return res.data;
    },
  },
};

export default api;
