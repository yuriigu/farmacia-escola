import { describe, it, expect, vi, beforeEach } from 'vitest';
import { agendamentoService } from '@/services/agendamentoService';
import { api } from '@/services/api';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('agendamentoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getSlots deve buscar slots sem parâmetro de data', async () => {
    const mockSlots = [{ id: 1, date: '2025-10-15', timeSlot: '08:00', maxCapacity: 10 }];
    (api.get as any).mockResolvedValue(mockSlots);

    const result = await agendamentoService.getSlots();

    expect(api.get).toHaveBeenCalledWith('/schedule-slots');
    expect(result).toEqual(mockSlots);
  });

  it('getSlots deve incluir query param quando data for fornecida', async () => {
    const mockSlots = [{ id: 1, date: '2025-10-15' }];
    (api.get as any).mockResolvedValue(mockSlots);

    const result = await agendamentoService.getSlots('2025-10-15');

    expect(api.get).toHaveBeenCalledWith('/schedule-slots?date=2025-10-15');
    expect(result).toEqual(mockSlots);
  });

  it('createSlot deve postar novo slot', async () => {
    const newSlot = { date: '2025-10-16', timeSlot: '10:00', maxCapacity: 5 };
    (api.post as any).mockResolvedValue({ id: 2, ...newSlot });

    const result = await agendamentoService.createSlot(newSlot);

    expect(api.post).toHaveBeenCalledWith('/schedule-slots', newSlot);
    expect(result).toHaveProperty('id', 2);
  });

  it('deleteSlot deve chamar rota de exclusão com ID', async () => {
    (api.delete as any).mockResolvedValue({ success: true });

    const result = await agendamentoService.deleteSlot(1);

    expect(api.delete).toHaveBeenCalledWith('/schedule-slots/1');
    expect(result).toEqual({ success: true });
  });

  it('getAppointments deve buscar agendamentos', async () => {
    const mockAppts = [{ id: 1, status: 'PENDING' }];
    (api.get as any).mockResolvedValue(mockAppts);

    const result = await agendamentoService.getAppointments();

    expect(api.get).toHaveBeenCalledWith('/appointments');
    expect(result).toEqual(mockAppts);
  });

  it('createAppointment deve enviar agendamento', async () => {
    const payload = { slotId: 1, notes: 'Primeira dose' };
    (api.post as any).mockResolvedValue({ id: 10, ...payload });

    const result = await agendamentoService.createAppointment(payload);

    expect(api.post).toHaveBeenCalledWith('/appointments', payload);
    expect(result.id).toBe(10);
  });

  it('updateAppointmentStatus deve atualizar status', async () => {
    (api.put as any).mockResolvedValue({ id: 10, status: 'CONFIRMED' });

    const result = await agendamentoService.updateAppointmentStatus(10, 'CONFIRMED');

    expect(api.put).toHaveBeenCalledWith('/appointments/10', { status: 'CONFIRMED' });
    expect(result.status).toBe('CONFIRMED');
  });
});
