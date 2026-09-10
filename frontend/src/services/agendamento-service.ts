// IMPORTS LOCAIS
import { api } from './api';
import { ScheduleSlot, Appointment } from '@/types';

// SERVICO DE AGENDAMENTO E HORARIOS
export const agendamentoService = {
  // BUSCA HORARIOS DISPONIVEIS
  getSlots: (date?: string) => {
    let url = '/schedule-slots';
    if (date) {
      url = `/schedule-slots?date=${date}`;
    } else {
      url = '/schedule-slots';
    }
    return api.get<ScheduleSlot[]>(url);
  },

  // CRIA NOVO HORARIO
  createSlot: (data: Partial<ScheduleSlot>) => {
    return api.post<ScheduleSlot>('/schedule-slots', data);
  },

  // REMOVE HORARIO
  deleteSlot: (id: number) => {
    return api.delete<{ success: boolean }>(`/schedule-slots/${id}`);
  },

  // BUSCA AGENDAMENTOS
  getAppointments: () => {
    return api.get<Appointment[]>('/appointments');
  },

  // CRIA NOVO AGENDAMENTO
  createAppointment: (data: Partial<Appointment>) => {
    return api.post<Appointment>('/appointments', data);
  },

  // ATUALIZA STATUS DO AGENDAMENTO
  updateAppointmentStatus: (id: number, status: string) => {
    return api.put<Appointment>(`/appointments/${id}`, { status });
  },
};