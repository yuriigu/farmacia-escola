'use client';

import { api as serviceApi, ActivityLogEntry } from '@/services/api';
import type { AuthUser, Medicine, Batch, Patient, User, Withdrawal, Disposal, Appointment, ScheduleSlot } from './types';

export type { ActivityLogEntry };

export const api = {
  // Auth
  login: (email: string, password: string) => serviceApi.auth.login(email, password),
  register: (data: { name: string; email: string; password: string; cpf: string; phone?: string; birthDate?: string; address?: string }) =>
    serviceApi.auth.register(data),
  me: () => serviceApi.auth.me(),
  updateProfilePassword: (data: { currentPassword?: string; newPassword?: string; name?: string; phone?: string }) =>
    serviceApi.auth.updateProfile(data),

  // Medicines
  getMedicines: () => serviceApi.medicines.getAll(),
  getMedicineById: (id: number) => serviceApi.medicines.getById(id),
  createMedicine: (data: { name: string; activeIngredient?: string; dosage?: string; accessibleDesc?: string; category?: string }) =>
    serviceApi.medicines.create(data),
  updateMedicine: (id: number, data: Record<string, unknown>) =>
    serviceApi.medicines.update(id, data),
  deleteMedicine: (id: number) => serviceApi.medicines.delete(id),

  // Batches
  getBatches: (medicineId?: number) => serviceApi.batches.getAll(medicineId),
  createBatch: (data: { medicineId: number; batchNumber: string; currentQuantity: number; expirationDate: string }) =>
    serviceApi.batches.create(data),
  updateBatch: (id: number, data: { batchNumber?: string; currentQuantity?: number; expirationDate?: string }) =>
    serviceApi.batches.update(id, data),
  deleteBatch: (id: number) => serviceApi.batches.delete(id),

  // Withdrawals
  getWithdrawals: () => serviceApi.withdrawals.getAll(),
  createWithdrawal: (data: { patientName: string; patientCpf: string; batchId: number; quantity: number; notes?: string }) =>
    serviceApi.withdrawals.create(data),
  cancelWithdrawal: (id: number) => serviceApi.withdrawals.cancel(id),

  // Disposals
  getDisposals: () => serviceApi.disposals.getAll(),
  createDisposal: (data: { batchId: number; quantity: number; reason: string }) =>
    serviceApi.disposals.create(data),
  revertDisposal: (id: number) => serviceApi.disposals.revert(id),

  // Appointments
  getAppointments: () => serviceApi.appointments.getAll(),
  getAppointmentById: (id: number) => serviceApi.appointments.getById(id),
  createAppointment: (data: {
    items: Array<{ medicineId: number; quantity: number }>;
    scheduledDate: string;
    scheduledTime?: string;
    slotId?: number;
    patientId?: number;
    notes?: string;
    patientName?: string;
    patientCpf?: string;
  }) => serviceApi.appointments.create(data),
  confirmAppointment: (id: number) => serviceApi.appointments.updateStatus(id, 'CONFIRMED'),
  completeAppointment: (id: number) => serviceApi.appointments.updateStatus(id, 'COMPLETED'),
  cancelAppointment: (id: number) => serviceApi.appointments.cancel(id),

  // Patients
  getPatients: (search?: string) => serviceApi.patients.getAll(search),
  getPatientById: (id: number) => serviceApi.patients.getById(id),
  createPatient: (data: Record<string, unknown>) => serviceApi.patients.create(data),
  updatePatient: (id: number, data: Record<string, unknown>) => serviceApi.patients.update(id, data),
  deletePatient: (id: number) => serviceApi.patients.delete(id),

  // Users
  getUsers: () => serviceApi.users.getAll(),
  createUser: (data: Record<string, unknown>) => serviceApi.users.create(data),
  updateUser: (id: number, data: Record<string, unknown>) => serviceApi.users.update(id, data),
  deleteUser: (id: number) => serviceApi.users.delete(id),

  // Activity Logs
  getActivityLogs: (params?: { userId?: number; entity?: string; page?: number; limit?: number }) =>
    serviceApi.activityLogs.getAll(params),

  // Schedule Slots
  getScheduleSlots: (params?: { startDate?: string; endDate?: string }) =>
    serviceApi.scheduleSlots.getAll(params),
  createScheduleSlot: (data: { date: string; timeSlot: string; maxCapacity?: number; assignedToId?: number }) =>
    serviceApi.scheduleSlots.create(data),
  deleteScheduleSlot: (id: number) => serviceApi.scheduleSlots.delete(id),
};

export default api;
