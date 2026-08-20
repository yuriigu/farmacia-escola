'use client';

import type { AuthUser, Medicine, Batch, Patient, User, Withdrawal, Disposal, Appointment, ScheduleSlot } from './types';

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

const API_BASE = '';

interface ApiError {
  status: number;
  error: string;
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Erro na requisição.' }));
    const err: ApiError = { status: res.status, error: body.error || 'Erro desconhecido.' };
    throw err;
  }

  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    fetchApi<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (data: { name: string; email: string; password: string; cpf: string; phone?: string; birthDate?: string; address?: string }) =>
    fetchApi<{ token: string; user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () => fetchApi<AuthUser>('/api/auth/me'),

  // Medicines
  getMedicines: () => fetchApi<Medicine[]>('/api/medicines'),
  createMedicine: (data: { name: string; activeIngredient?: string; dosage?: string; accessibleDesc?: string; category?: string }) =>
    fetchApi<Medicine>('/api/medicines', { method: 'POST', body: JSON.stringify(data) }),
  updateMedicine: (id: number, data: Record<string, unknown>) =>
    fetchApi<Medicine>(`/api/medicines/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMedicine: (id: number) =>
    fetchApi<{ message: string }>(`/api/medicines/${id}`, { method: 'DELETE' }),

  // Batches
  getBatches: (medicineId?: number) =>
    fetchApi<Batch[]>(`/api/batches${medicineId ? `?medicineId=${medicineId}` : ''}`),
  createBatch: (data: { medicineId: number; batchNumber: string; currentQuantity: number; expirationDate: string }) =>
    fetchApi<Batch>('/api/batches', { method: 'POST', body: JSON.stringify(data) }),
  updateBatch: (id: number, data: { batchNumber?: string; currentQuantity?: number; expirationDate?: string }) =>
    fetchApi<Batch>(`/api/batches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBatch: (id: number) =>
    fetchApi<{ message: string }>(`/api/batches/${id}`, { method: 'DELETE' }),

  // Withdrawals
  getWithdrawals: () => fetchApi<Withdrawal[]>('/api/withdrawals'),
  createWithdrawal: (data: { patientName: string; patientCpf: string; batchId: number; quantity: number; notes?: string }) =>
    fetchApi<{ message: string; withdrawal: Withdrawal }>('/api/withdrawals', { method: 'POST', body: JSON.stringify(data) }),
  updateWithdrawal: (id: number, notes: string) =>
    fetchApi<Withdrawal>(`/api/withdrawals/${id}`, { method: 'PUT', body: JSON.stringify({ notes }) }),
  cancelWithdrawal: (id: number) =>
    fetchApi<{ message: string }>(`/api/withdrawals/${id}`, { method: 'DELETE' }),

  // Disposals
  getDisposals: () => fetchApi<Disposal[]>('/api/disposals'),
  createDisposal: (data: { batchId: number; quantity: number; reason: string }) =>
    fetchApi<{ message: string; disposal: Disposal }>('/api/disposals', { method: 'POST', body: JSON.stringify(data) }),
  updateDisposal: (id: number, reason: string) =>
    fetchApi<Disposal>(`/api/disposals/${id}`, { method: 'PUT', body: JSON.stringify({ reason }) }),
  deleteDisposal: (id: number) =>
    fetchApi<{ message: string }>(`/api/disposals/${id}`, { method: 'DELETE' }),
  revertDisposal: (id: number) =>
    fetchApi<{ message: string }>(`/api/disposals/${id}/revert`, { method: 'POST' }),

  // Appointments
  getAppointments: () => fetchApi<Appointment[]>('/api/appointments'),
  createAppointment: (data: { items: Array<{ medicineId: number; quantity: number }>; scheduledDate: string; scheduledTime?: string; slotId?: number; patientId?: number; notes?: string; patientName?: string; patientCpf?: string }) =>
    fetchApi<Appointment>('/api/appointments', { method: 'POST', body: JSON.stringify(data) }),
  confirmAppointment: (id: number) =>
    fetchApi<Appointment>(`/api/appointments/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'CONFIRMED' }) }),
  completeAppointment: (id: number) =>
    fetchApi<Appointment>(`/api/appointments/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'COMPLETED' }) }),
  cancelAppointment: (id: number) =>
    fetchApi<Appointment>(`/api/appointments/${id}`, { method: 'DELETE' }),

  // Doctor History (autocomplete by CPF)
  getDoctorHistory: (cpf: string) =>
    fetchApi<Array<{ id: number; name: string; cpf: string }>>(`/api/appointments/doctor-history?cpf=${encodeURIComponent(cpf)}`),

  // Patients
  getPatients: (search?: string) =>
    fetchApi<Patient[]>(`/api/patients${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  createPatient: (data: Record<string, unknown>) =>
    fetchApi<Patient>('/api/patients', { method: 'POST', body: JSON.stringify(data) }),
  updatePatient: (id: number, data: Record<string, unknown>) =>
    fetchApi<Patient>(`/api/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePatient: (id: number) =>
    fetchApi<{ message: string }>(`/api/patients/${id}`, { method: 'DELETE' }),

  // Users
  getUsers: () => fetchApi<User[]>('/api/users'),
  createUser: (data: Record<string, unknown>) =>
    fetchApi<User>('/api/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: number, data: Record<string, unknown>) =>
    fetchApi<User>(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: number) =>
    fetchApi<{ message: string }>(`/api/users/${id}`, { method: 'DELETE' }),

  // Activity Logs
  getActivityLogs: (params?: { userId?: number; entity?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.userId) sp.set('userId', String(params.userId));
    if (params?.entity) sp.set('entity', params.entity);
    if (params?.page) sp.set('page', String(params.page));
    if (params?.limit) sp.set('limit', String(params.limit));
    const qs = sp.toString();
    return fetchApi<{ logs: ActivityLogEntry[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(`/api/activity-logs${qs ? `?${qs}` : ''}`);
  },

  // Schedule Slots
  getScheduleSlots: (params?: { startDate?: string; endDate?: string }) => {
    const sp = new URLSearchParams();
    if (params?.startDate) sp.set('startDate', params.startDate);
    if (params?.endDate) sp.set('endDate', params.endDate);
    const qs = sp.toString();
    return fetchApi<ScheduleSlot[]>(`/api/schedule-slots${qs ? `?${qs}` : ''}`);
  },
  createScheduleSlot: (data: { date: string; timeSlot: string; maxCapacity?: number; assignedToId?: number }) =>
    fetchApi<ScheduleSlot>('/api/schedule-slots', { method: 'POST', body: JSON.stringify(data) }),
  updateScheduleSlot: (id: number, data: { maxCapacity?: number; active?: boolean; assignedToId?: number }) =>
    fetchApi<ScheduleSlot>(`/api/schedule-slots/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteScheduleSlot: (id: number) =>
    fetchApi<{ message: string }>(`/api/schedule-slots/${id}`, { method: 'DELETE' }),

  // Profile (self-update)
  updateProfilePassword: (data: { currentPassword: string; newPassword: string }) =>
    fetchApi<{ message: string }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
