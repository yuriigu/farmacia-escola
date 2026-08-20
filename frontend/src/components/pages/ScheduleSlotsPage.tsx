'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, Edit3,
  Clock, Users, AlertTriangle, Check, X, Loader2, Calendar
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { fetchScheduleSlotsData } from '@/lib/pharmacy-store';
import { APPOINTMENT_STATUS_LABELS, canWriteClient } from '@/lib/constants';
import type { ScheduleSlot } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const TIME_OPTIONS = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];

export function ScheduleSlotsPage() {
  const user = useAuthStore((s) => s.user);
  const scheduleSlots = usePharmacyStore((s) => s.scheduleSlots);
  const setScheduleSlots = usePharmacyStore((s) => s.setState);
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
    return () => { active = false; };
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

  const handleOpenCreate = (date: string) => {
    setEditSlot(null);
    setForm({ date, timeSlot: '09:00', maxCapacity: 4 });
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
        await api.updateScheduleSlot(editSlot.id, {
          maxCapacity: form.maxCapacity,
          active: true,
        });
        toast.success('Horário atualizado!');
      } else {
        await api.createScheduleSlot({
          date: form.date,
          timeSlot: form.timeSlot,
          maxCapacity: form.maxCapacity,
        });
        toast.success('Horário criado com sucesso!');
      }
      setModalOpen(false);
      // Reload
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
    if (!confirm(`Excluir horário ${slot.timeSlot}?`)) return;
    try {
      await api.deleteScheduleSlot(slot.id);
      toast.success('Horário excluído!');
      const startDate = startOfMonth.toISOString().split('T')[0];
      const endDate = endOfMonth.toISOString().split('T')[0];
      fetchScheduleSlotsData({ startDate, endDate });
    } catch (err: unknown) {
      const error = err as { error?: string };
      toast.error(error.error || 'Erro ao excluir horário.');
    }
  };

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-emerald-600" />Escala de Horários
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gerencie os horários disponíveis para agendamento de retirada
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); } else setViewMonth(viewMonth - 1);
          }}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-medium text-slate-800 dark:text-slate-200 text-sm min-w-[150px] text-center">{capitalizedMonth}</span>
          <Button variant="outline" size="sm" onClick={() => {
            if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); } else setViewMonth(viewMonth + 1);
          }}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); }} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Calendar className="w-4 h-4 mr-1" />Hoje
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="glass-card rounded-2xl border-0 shadow-none">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{scheduleSlots.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1"><Clock className="w-3 h-3" />Total de Horários</p>
          </CardContent>
        </Card>
        <Card className="glass-card rounded-2xl border-0 shadow-none">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{Object.keys(slotsByDate).length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1"><CalendarDays className="w-3 h-3" />Dias Atendidos</p>
          </CardContent>
        </Card>
        <Card className="glass-card rounded-2xl border-0 shadow-none">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-800 dark:text-white">
              {scheduleSlots.reduce((s, slot) => s + (slot.maxCapacity - (slot._count?.appointments || 0)), 0)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1"><Users className="w-3 h-3" />Vagas Disponíveis</p>
          </CardContent>
        </Card>
        <Card className="glass-card rounded-2xl border-0 shadow-none">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-500">
              {scheduleSlots.filter((s) => (s._count?.appointments || 0) >= s.maxCapacity).length}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1"><AlertTriangle className="w-3 h-3" />Horários Lotados</p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card className="glass-card rounded-2xl border-0 shadow-none p-4 sm:p-6">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wide py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            if (d === null) return <div key={i} className="aspect-square" />;
            const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const daySlots = slotsByDate[dateKey] || [];
            const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === d;
            const isPast = new Date(viewYear, viewMonth, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const hasSlots = daySlots.length > 0;
            const allFull = daySlots.every((s) => (s._count?.appointments || 0) >= s.maxCapacity);

            return (
              <div
                key={i}
                className={`aspect-square rounded-xl p-1.5 flex flex-col items-center justify-center border transition-all cursor-pointer hover:shadow-md hover:scale-105 ${
                  isToday ? 'animate-glow-pulse border-emerald-300 bg-emerald-50/80 dark:bg-emerald-900/20' :
                  isPast ? 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 opacity-60' :
                  hasSlots ? (allFull ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-900/20' : 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/20') :
                  'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
                onClick={() => canWrite && !isPast && handleOpenCreate(dateKey)}
              >
                <span className={`text-sm font-medium ${isToday ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-slate-800 dark:text-slate-200'}`}>{d}</span>
                {hasSlots && (
                  <div className="mt-0.5 flex gap-0.5 flex-wrap justify-center">
                    {daySlots.slice(0, 3).map((s) => (
                      <span key={s.id} className={`text-[9px] px-1 rounded-full ${
                        (s._count?.appointments || 0) >= s.maxCapacity ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                      }`}>
                        {s.timeSlot}
                      </span>
                    ))}
                    {daySlots.length > 3 && (
                      <span className="text-[9px] text-slate-400">+{daySlots.length - 3}</span>
                    )}
                  </div>
                )}
                {!hasSlots && !isPast && canWrite && (
                  <Plus className="w-3 h-3 text-slate-300 dark:text-slate-600 mt-0.5" />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Slot List for selected date */}
      {Object.keys(slotsByDate).length > 0 && (
        <Card className="glass-card rounded-2xl border-0 shadow-none p-4 sm:p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-500" />Todos os Horários do Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
              {Object.entries(slotsByDate)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([dateKey, slots]) => (
                  <div key={dateKey} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-500" />
                        <span className="font-medium text-sm text-slate-800 dark:text-white">
                          {new Date(dateKey + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {slots.length} horário{slots.length > 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {slots.map((slot) => (
                        <div
                          key={slot.id}
                          className={`flex-1 min-w-[120px] rounded-lg border p-2.5 text-xs transition-all ${
                            (slot._count?.appointments || 0) >= slot.maxCapacity
                              ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-slate-800 dark:text-white">{slot.timeSlot}</span>
                            {canWrite && (
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleOpenEdit(slot)} className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button onClick={() => handleDelete(slot)} className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                            <span>{slot._count?.appointments || 0}/{slot.maxCapacity}</span>
                            {(slot._count?.appointments || 0) >= slot.maxCapacity ? (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">Lotado</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">Disponível</Badge>
                            )}
                          </div>
                          {slot.assignedTo && (
                            <div className="mt-1 pt-1.5 border-t border-slate-100 dark:border-slate-700">
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                <Users className="w-2.5 h-2.5" />
                                {slot.assignedTo.name}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Modal */}
      {canWrite && (
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-800 dark:text-white">
              {editSlot ? 'Editar Horário' : 'Novo Horário'}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              {editSlot ? `Editando horário ${editSlot.timeSlot}` : 'Adicione um novo horário na escala'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Data</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                disabled={!!editSlot}
                className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Horário</Label>
              <select
                value={form.timeSlot}
                onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
                disabled={!!editSlot}
                className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-white text-sm px-3"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Capacidade Máxima</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={form.maxCapacity}
                onChange={(e) => setForm({ ...form, maxCapacity: Number(e.target.value) })}
                className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
              />
              <p className="text-xs text-slate-400 dark:text-slate-500">Máximo de agendamentos neste horário</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                {editSlot ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}
