import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { waitFor } from '@testing-library/dom';
import { useAgendamento } from '@/hooks/UseAgendamento';
import { agendamentoService } from '@/services/agendamentoService';
import { mockAppointmentsList, mockScheduleSlot } from '../../fixtures/appointment.fixture';

vi.mock('@/services/agendamentoService', () => ({
  agendamentoService: {
    getSlots: vi.fn(),
    getAppointments: vi.fn(),
    createAppointment: vi.fn(),
  },
}));

describe('useAgendamento Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (agendamentoService.getSlots as any).mockResolvedValue([mockScheduleSlot]);
    (agendamentoService.getAppointments as any).mockResolvedValue(mockAppointmentsList);
  });

  it('deve carregar slots e agendamentos', async () => {
    const { result } = renderHook(() => useAgendamento());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.slots).toEqual([mockScheduleSlot]);
    expect(result.current.appointments).toEqual(mockAppointmentsList);
  });

  it('bookAppointment deve criar agendamento', async () => {
    const newAppt = { id: 20, slotId: 1, notes: 'Consulta' };
    (agendamentoService.createAppointment as any).mockResolvedValue(newAppt);

    const { result } = renderHook(() => useAgendamento());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      const created = await result.current.bookAppointment(1, 'Consulta');
      expect(created).toEqual(newAppt);
    });
  });
});
