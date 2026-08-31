'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, Edit3,
  Clock, Users, AlertTriangle, Check, Calendar, Loader2
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { usePharmacyStore, fetchScheduleSlotsData } from '@/lib/pharmacy-store';
import { api } from '@/lib/api';
import { apiClient } from '@/lib/axios';
import { canWriteClient } from '@/lib/constants';
import type { ScheduleSlot } from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const TIME_OPTIONS = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];

export function ScheduleSlotsPage() {
  const user = useAuthStore((s) => s.user);
  const scheduleSlots = usePharmacyStore((s) => s.scheduleSlots);
  const canWrite = canWriteClient(user?.role, user?.permissions, 'schedule-slots');

  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [modalOpen, setModalOpen] = useState(false);
  const [editSlot, setEditSlot] = useState<ScheduleSlot | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: '', timeSlot: '09:00', maxCapacity: 4 });

  const today = new Date();
  const startOfMonth = new Date(viewYear, viewMonth, 1);
  const endOfMonth = new Date(viewYear, viewMonth + 1, 0);

  // Load slots for visible month
  useEffect(() => {
    let active = true;
    const startDate = startOfMonth.toISOString().split('T')[0];
    const endDate = endOfMonth.toISOString().split('T')[0];
    fetchScheduleSlotsData({ startDate, endDate }).then(() => {}).catch(() => {});
    return () => {
      active = false;
    };
  }, [viewYear, viewMonth]);

  // Group slots by date
  const slotsByDate = useMemo(() => {
    const map: Record<string, ScheduleSlot[]> = {};
    scheduleSlots.forEach((s) => {
      const dateKey = s.date.split('T')[0];
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(s);
    });
    return map;
  }, [scheduleSlots]);

  // Build month days
  const buildMonthDays = (year: number, month: number) => {
    const first = new Date(year, month, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  };

  const days = buildMonthDays(viewYear, viewMonth);
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const capitalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const handleOpenCreate = (date?: string) => {
    setEditSlot(null);
    setForm({
      date: date || new Date().toISOString().split('T')[0],
      timeSlot: '09:00',
      maxCapacity: 4,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (slot: ScheduleSlot) => {
    setEditSlot(slot);
    setForm({
      date: slot.date.split('T')[0],
      timeSlot: slot.timeSlot,
      maxCapacity: slot.maxCapacity,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.date || !form.timeSlot) return;
    setSaving(true);
    try {
      if (editSlot) {
        await apiClient.put(`/api/schedule-slots/${editSlot.id}`, {
          maxCapacity: form.maxCapacity,
          active: true,
        });
        toast.success('Horário atualizado com sucesso.');
      } else {
        await api.createScheduleSlot({
          date: form.date,
          timeSlot: form.timeSlot,
          maxCapacity: form.maxCapacity,
        });
        toast.success('Horário cadastrado na escala.');
      }
      setModalOpen(false);
      const startDate = startOfMonth.toISOString().split('T')[0];
      const endDate = endOfMonth.toISOString().split('T')[0];
      fetchScheduleSlotsData({ startDate, endDate });
    } catch (err: unknown) {
      const error = err as { error?: string };
      toast.error(error.error || 'Erro ao salvar horário.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slot: ScheduleSlot) => {
    try {
      await api.deleteScheduleSlot(slot.id);
      toast.success('Horário removido da escala.');
      const startDate = startOfMonth.toISOString().split('T')[0];
      const endDate = endOfMonth.toISOString().split('T')[0];
      fetchScheduleSlotsData({ startDate, endDate });
    } catch (err: unknown) {
      const error = err as { error?: string };
      toast.error(error.error || 'Erro ao excluir horário.');
    }
  };

  return (
    <div className="space-y-5 page-enter">
      {/* Standardized PageHeader */}
      <PageHeader
        title="Escala de Horários de Atendimento"
        description="Configure os horários disponíveis e o limite de vagas para agendamento de dispensação."
        icon={CalendarDays}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (viewMonth === 0) {
                    setViewMonth(11);
                    setViewYear(viewYear - 1);
                  } else setViewMonth(viewMonth - 1);
                }}
                className="h-8 w-8 p-0 rounded-lg"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs px-2 min-w-[120px] text-center">
                {capitalizedMonth}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (viewMonth === 11) {
                    setViewMonth(0);
                    setViewYear(viewYear + 1);
                  } else setViewMonth(viewMonth + 1);
                }}
                className="h-8 w-8 p-0 rounded-lg"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {canWrite && (
              <Button
                onClick={() => handleOpenCreate()}
                className="h-10 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm active:scale-[0.98] transition-transform"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Horário</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Calendar Grid Container */}
      <Card className="rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-5">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
            <div key={d} className="text-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider py-1.5">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d, i) => {
            if (d === null) return <div key={i} className="aspect-square rounded-xl bg-slate-50/50 dark:bg-slate-900/20" />;
            const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const daySlots = slotsByDate[dateKey] || [];
            const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === d;
            const isPast = new Date(viewYear, viewMonth, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const hasSlots = daySlots.length > 0;
            const allFull = daySlots.every((s) => (s._count?.appointments || 0) >= s.maxCapacity);

            return (
              <div
                key={i}
                className={`min-h-[85px] rounded-xl p-2 flex flex-col justify-between border transition-all ${
                  canWrite && !isPast ? 'cursor-pointer hover:border-emerald-400 hover:shadow-xs' : ''
                } ${
                  isToday
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20 shadow-xs'
                    : isPast
                    ? 'border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 opacity-70'
                    : hasSlots
                    ? allFull
                      ? 'border-amber-200 bg-amber-50/30 dark:border-amber-900/40'
                      : 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/40'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                }`}
                onClick={() => canWrite && !isPast && handleOpenCreate(dateKey)}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold ${
                      isToday ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {d}
                  </span>
                  {isToday && (
                    <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                      Hoje
                    </span>
                  )}
                </div>

                {hasSlots && (
                  <div className="flex gap-1 flex-wrap mt-1">
                    {daySlots.slice(0, 3).map((s) => (
                      <span
                        key={s.id}
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                          (s._count?.appointments || 0) >= s.maxCapacity
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        }`}
                      >
                        {s.timeSlot}
                      </span>
                    ))}
                    {daySlots.length > 3 && (
                      <span className="text-[10px] font-bold text-slate-400">+{daySlots.length - 3}</span>
                    )}
                  </div>
                )}

                {!hasSlots && !isPast && canWrite && (
                  <div className="text-[10px] text-slate-300 dark:text-slate-600 flex items-center gap-0.5">
                    <Plus className="w-3 h-3" /> Adicionar
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Slots Detailed Schedule List */}
      {Object.keys(slotsByDate).length > 0 && (
        <Card className="rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-5">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Detalhamento dos Horários Configurados no Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-3">
            {Object.entries(slotsByDate)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([dateKey, slots]) => (
                <div key={dateKey} className="rounded-xl border border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                      {new Date(dateKey + 'T12:00:00').toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-white dark:bg-slate-700">
                      {slots.length} horário{slots.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {slots.map((slot) => (
                      <div
                        key={slot.id}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{slot.timeSlot}</span>
                          {canWrite && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEdit(slot)}
                                className="text-slate-400 hover:text-emerald-600 p-0.5"
                                title="Editar vaga"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDelete(slot)}
                                className="text-slate-400 hover:text-rose-600 p-0.5"
                                title="Excluir horário"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span>
                            {slot._count?.appointments || 0}/{slot.maxCapacity} vagas
                          </span>
                          {(slot._count?.appointments || 0) >= slot.maxCapacity ? (
                            <span className="text-[9px] font-bold text-amber-600">Lotado</span>
                          ) : (
                            <span className="text-[9px] font-bold text-emerald-600">Livre</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Modal */}
      {canWrite && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-emerald-600" />
                {editSlot ? 'Editar Horário' : 'Novo Horário na Escala'}
              </DialogTitle>
              <DialogDescription>
                {editSlot
                  ? `Alterando capacidade do horário ${editSlot.timeSlot}`
                  : 'Selecione a data, horário e capacidade máxima de atendimentos.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <div>
                <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                  Data
                </Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  disabled={Boolean(editSlot)}
                  className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                  Horário
                </Label>
                <select
                  value={form.timeSlot}
                  onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
                  disabled={Boolean(editSlot)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 text-sm focus:outline-none"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md inline-block">
                  Capacidade Máxima (Vagas)
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={form.maxCapacity}
                  onChange={(e) => setForm({ ...form, maxCapacity: Number(e.target.value) })}
                  className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl">
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editSlot ? 'Salvar Alterações' : 'Criar Horário'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}