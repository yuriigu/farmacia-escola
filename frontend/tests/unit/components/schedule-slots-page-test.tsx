import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScheduleSlotsPage } from '@/components/pages/schedule-slots-page';

const slot = {
  id: 1,
  date: '2026-09-12T00:00:00.000Z',
  timeSlot: '08:00',
  maxCapacity: 4,
  active: true,
  assignedToId: 7,
  assignedTo: { id: 7, name: 'Pedro Almeida', role: 'FARMACEUTICO' },
  _count: { appointments: 1 },
};

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector: (state: { user: { id: number; role: string } }) => unknown) => selector({ user: { id: 7, role: 'FARMACEUTICO' } }),
}));

vi.mock('@/lib/pharmacy-store', () => ({
  usePharmacyStore: (selector: (state: { scheduleSlots: typeof slot[] }) => unknown) => selector({ scheduleSlots: [slot] }),
  fetchScheduleSlotsData: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/api', () => ({
  api: {
    getUsers: vi.fn(() => Promise.resolve([{ id: 7, name: 'Pedro Almeida', role: 'FARMACEUTICO' }])),
    createScheduleSlot: vi.fn(),
    deleteScheduleSlot: vi.fn(),
  },
}));

vi.mock('@/lib/axios', () => ({ apiClient: { put: vi.fn() } }));

describe('schedule-slots-page', () => {
  it('renders the responsible pharmacist select and disables occupied slot deletion', async () => {
    render(<ScheduleSlotsPage />);

    expect(screen.getByText('Escala de Horários de Atendimento')).toBeInTheDocument();
    expect(screen.getByTitle('Possui agendamentos vinculados')).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Novo Horário/i }));

    expect(screen.getByText('Farmacêutico responsável')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole('combobox')[0]).toBeInTheDocument());
  });
});
