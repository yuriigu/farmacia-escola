import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppointmentDetailsModal } from '@/components/modals/appointment-details-modal';
import { mockAppointment } from '../../fixtures/appointment-fixture';

// usuario da equipe (farmaceutico) ve as acoes de status no modal.
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector: (state: { user: { id: number; role: string } }) => unknown) =>
    selector({ user: { id: 7, role: 'FARMACEUTICO' } }),
}));

vi.mock('@/lib/pharmacy-store', () => ({
  fetchAppointmentsData: vi.fn(() => Promise.resolve()),
  fetchScheduleSlotsData: vi.fn(() => Promise.resolve()),
  fetchMedicinesData: vi.fn(() => Promise.resolve()),
  fetchBatchesData: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/api', () => ({
  api: {
    confirmAppointment: vi.fn(() => Promise.resolve()),
    completeAppointment: vi.fn(() => Promise.resolve({ id: 1 })),
  },
}));

describe('AppointmentDetailsModal', () => {
  it('exibe dados do agendamento (paciente, medicamento, observacoes)', () => {
    render(<AppointmentDetailsModal appointment={mockAppointment} onOpenChange={() => {}} />);

    expect(screen.getByText('Detalhes do Atendimento')).toBeInTheDocument();
    expect(screen.getByText(mockAppointment.patient!.name)).toBeInTheDocument();
    expect(screen.getByText('Primeira dispensação')).toBeInTheDocument();
  });

  it('nao renderiza nada quando nao ha agendamento selecionado', () => {
    render(<AppointmentDetailsModal appointment={null} onOpenChange={() => {}} />);

    expect(screen.queryByText('Detalhes do Atendimento')).not.toBeInTheDocument();
  });

  it('aciona confirmar para equipe nao-medico', async () => {
    const { api } = await import('@/lib/api');
    render(<AppointmentDetailsModal appointment={mockAppointment} onOpenChange={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Agendamento/i }));
    await waitFor(() => expect(api.confirmAppointment).toHaveBeenCalledWith(mockAppointment.id));
  });
});
