'use client';

import { api as serviceApi } from '@/services/api';

// camada de adaptacao do cliente http pro resto do app. o service
// real (/services/api) expoe os recursos agrupados (auth.medicines,
// batches, etc), mas as telas costumam usar nomes mais "planos" e
// descritivos (login, getmedicines, createbatch...).
// esse objeto e um facade: cada entrada e so um atalho que delega
// pra serviceapi. assim as telas dependem de uma api estavel e o
// service por baixo pode mudar de forma sem impacto grande.
export const api = {
  // auth: login, cadastro publico, leitura do proprio perfil e
  // atualizacao de senha/perfil.
  login: (email: string, password: string) => serviceApi.auth.login(email, password),
  register: (data: { name: string; email: string; password: string; cpf: string; phone?: string; birthDate?: string; address?: string }) =>
    serviceApi.auth.register(data),
  me: () => serviceApi.auth.me(),
  updateProfile: (data: { currentPassword?: string; newPassword?: string; name?: string; email?: string; phone?: string; address?: string }) =>
    serviceApi.auth.updateProfile(data),
  updateProfilePassword: (data: { currentPassword?: string; newPassword?: string; name?: string; phone?: string; address?: string }) =>
    serviceApi.auth.updateProfile(data),

  // medicines: crud do catalogo de medicamentos.
  getMedicines: () => serviceApi.medicines.getAll(),
  getMedicineById: (id: number) => serviceApi.medicines.getById(id),
  createMedicine: (data: { name: string; activeIngredient?: string; dosage?: string; accessibleDesc?: string; category?: string }) =>
    serviceApi.medicines.create(data),
  updateMedicine: (id: number, data: Record<string, unknown>) =>
    serviceApi.medicines.update(id, data),
  deleteMedicine: (id: number) => serviceApi.medicines.delete(id),

  // batches: crud de lotes + as duas operacoes sensiveis (block e
  // adjust), que passam por endpoints auditados no backend.
  getBatches: (medicineId?: number) => serviceApi.batches.getAll(medicineId),
  createBatch: (data: {
    medicineId: number;
    batchNumber: string;
    currentQuantity: number;
    expirationDate: string;
    manufacturingDate?: string | null;
    supplier: string;
    isBlocked?: boolean;
    blockReason?: string | null;
  }) => serviceApi.batches.create(data),
  updateBatch: (id: number, data: { batchNumber?: string; currentQuantity?: number; expirationDate?: string; supplier?: string; manufacturingDate?: string | null }) =>
    serviceApi.batches.update(id, data),
  blockBatch: (id: number, data: { isBlocked: boolean; blockReason?: string | null }) =>
    serviceApi.batches.block(id, data),
  adjustBatch: (id: number, data: { newQuantity: number; reason: string }) =>
    serviceApi.batches.adjust(id, data),
  deleteBatch: (id: number) => serviceApi.batches.delete(id),

  // disposals: listar, criar e reverter descartes.
  getDisposals: () => serviceApi.disposals.getAll(),
  createDisposal: (data: { batchId: number; quantity: number; reason: string; notes?: string }) =>
    serviceApi.disposals.create(data),
  revertDisposal: (id: number, revertReason: string) => serviceApi.disposals.revert(id, revertReason),

  // appointments: crud de agendamento + as transicoes de status
  // (confirm, complete) e o fluxo de dispensacao/estorno.
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
  dispenseAppointment: (id: number, data: { batchSelections?: Array<{ medicineId: number; batchId: number; quantity: number }>; notes?: string }) =>
    serviceApi.appointments.dispense(id, data),
  revertAppointmentDispense: (id: number, reason: string) => serviceApi.appointments.revertDispense(id, reason),
  // cancel: sempre exige justificativa no backend. quando nao veio,
  // usa um texto padrao pra nao quebrar a regra de negocio.
  cancelAppointment: (id: number, cancelReason?: string) => {
    let reason = 'Cancelamento solicitado pelo usuário';
    if (cancelReason) {
      reason = cancelReason;
    }
    return serviceApi.appointments.cancel(id, reason);
  },

  // patients: crud de pacientes.
  getPatients: (search?: string) => serviceApi.patients.getAll(search),
  getPatientById: (id: number) => serviceApi.patients.getById(id),
  createPatient: (data: Record<string, unknown>) => serviceApi.patients.create(data),
  updatePatient: (id: number, data: Record<string, unknown>) => serviceApi.patients.update(id, data),
  deletePatient: (id: number) => serviceApi.patients.delete(id),

  // users: crud de usuarios (gestao de contas).
  getUsers: () => serviceApi.users.getAll(),
  createUser: (data: Record<string, unknown>) => serviceApi.users.create(data),
  updateUser: (id: number, data: Record<string, unknown>) => serviceApi.users.update(id, data),
  deleteUser: (id: number) => serviceApi.users.delete(id),

  // activitylogs: leitura dos logs de auditoria (filtros opcionais
  // e paginacao).
  getActivityLogs: (params?: { userId?: number; entity?: string; page?: number; limit?: number }) =>
    serviceApi.activityLogs.getAll(params),

  // scheduleslots: listar com filtro de periodo e gerenciar slots.
  getScheduleSlots: (params?: { startDate?: string; endDate?: string }) =>
    serviceApi.scheduleSlots.getAll(params),
  createScheduleSlot: (data: { date: string; timeSlot: string; maxCapacity?: number; assignedToId?: number }) =>
    serviceApi.scheduleSlots.create(data),
  updateScheduleSlot: (id: number, data: {
    date?: string;
    timeSlot?: string;
    maxCapacity?: number;
    assignedToId?: number | null;
    active?: boolean;
  }) => serviceApi.scheduleSlots.update(id, data),
  deleteScheduleSlot: (id: number) => serviceApi.scheduleSlots.delete(id),
};