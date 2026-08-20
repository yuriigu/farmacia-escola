import { useState, useEffect, useCallback } from 'react';
import { agendamentoService } from '@/services/agendamentoService';
import { ScheduleSlot, Appointment } from '@/types';
import { toast } from 'sonner';

export function useAgendamento() {
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgenda = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [slotsData, apptsData] = await Promise.all([
        agendamentoService.getSlots(),
        agendamentoService.getAppointments(),
      ]);
      setSlots(slotsData);
      setAppointments(apptsData);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar agenda');
      toast.error('Erro ao carregar agenda');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgenda();
  }, [fetchAgenda]);

  const bookAppointment = async (slotId: number, notes?: string) => {
    try {
      const newAppt = await agendamentoService.createAppointment({ slotId, notes });
      setAppointments(prev => [...prev, newAppt]);
      toast.success('Agendamento realizado com sucesso!');
      await fetchAgenda();
      return newAppt;
    } catch (err: any) {
      toast.error(err.message || 'Erro ao realizar agendamento');
      throw err;
    }
  };

  return {
    slots,
    appointments,
    loading,
    error,
    refresh: fetchAgenda,
    bookAppointment,
  };
}