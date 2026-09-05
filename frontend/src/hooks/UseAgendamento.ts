// IMPORTS DO REACT
import { useState, useEffect, useCallback } from 'react';

// IMPORTS DE BIBLIOTECAS
import { toast } from 'sonner';

// IMPORTS LOCAIS
import { agendamentoService } from '@/services/AgendamentoService';
import { ScheduleSlot, Appointment } from '@/types';

// HOOK PERSONALIZADO PARA GERENCIAR AGENDAMENTOS
export function useAgendamento() {
  // DECLARACAO DOS ESTADOS
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // FUNCAO PARA BUSCAR AGENDAMENTOS E HORARIOS
  const fetchAgenda = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const responses = await Promise.all([
        agendamentoService.getSlots(),
        agendamentoService.getAppointments(),
      ]);
      const slotsData = responses[0];
      const apptsData = responses[1];
      setSlots(slotsData);
      setAppointments(apptsData);
    } catch (err: any) {
      let errorMessage = 'Erro ao carregar agenda';
      if (err) {
        if (err.message) {
          errorMessage = err.message;
        } else {
          errorMessage = 'Erro ao carregar agenda';
        }
      } else {
        errorMessage = 'Erro ao carregar agenda';
      }
      setError(errorMessage);
      toast.error('Erro ao carregar agenda');
    } finally {
      setLoading(false);
    }
  }, []);

  // EFEITO PARA CARREGAR DADOS INICIAIS
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      if (mounted) {
        await fetchAgenda();
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, [fetchAgenda]);

  // FUNCAO PARA AGENDAR CONSULTA
  const bookAppointment = async (slotId: number, notes?: string) => {
    try {
      const newAppt = await agendamentoService.createAppointment({ slotId, notes });
      setAppointments((prev) => {
        const updated = [...prev, newAppt];
        return updated;
      });
      toast.success('Agendamento realizado com sucesso!');
      await fetchAgenda();
      return newAppt;
    } catch (err: any) {
      let errorMessage = 'Erro ao realizar agendamento';
      if (err) {
        if (err.message) {
          errorMessage = err.message;
        } else {
          errorMessage = 'Erro ao realizar agendamento';
        }
      } else {
        errorMessage = 'Erro ao realizar agendamento';
      }
      toast.error(errorMessage);
      throw err;
    }
  };

  // RETORNO DO HOOK
  return {
    slots,
    appointments,
    loading,
    error,
    refresh: fetchAgenda,
    bookAppointment,
  };
}