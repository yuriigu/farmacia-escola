import { api } from './api';
import { ScheduleSlot, Appointment } from '@/types';

export const agendamentoService = {
  getSlots: (date?: string) => api.get<ScheduleSlot[]>(`/schedule-slots${date ? `?date=${date}` : ''}`),
  createSlot: (data: Partial<ScheduleSlot>) => api.post<ScheduleSlot>('/schedule-slots', data),
  deleteSlot: (id: number) => api.delete<{ success: boolean }>(`/schedule-slots/${id}`),

  getAppointments: () => api.get<Appointment[]>('/appointments'),
  createAppointment: (data: Partial<Appointment>) => api.post<Appointment>('/appointments', data),
  updateAppointmentStatus: (id: number, status: string) => api.put<Appointment>(`/appointments/${id}`, { status }),
};