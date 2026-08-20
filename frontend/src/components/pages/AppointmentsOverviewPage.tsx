'use client';

import { useState, useEffect } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, User } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { usePharmacyStore, fetchScheduleSlotsData } from '@/lib/pharmacy-store';
import type { Appointment } from '@/lib/types';
import { APPOINTMENT_STATUS_STYLES, APPOINTMENT_STATUS_LABELS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

export function AppointmentsOverviewPage() {
  const { appointments, scheduleSlots } = usePharmacyStore();
  const user = useAuthStore((s) => s.user);
  const isPatient = user?.role === 'PACIENTE';
  const isAdminOrFarm = user?.role === 'ADMIN' || user?.role === 'FARMACEUTICO';
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Load schedule slots on mount
  useEffect(() => {
    fetchScheduleSlotsData();
  }, []);

  const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const appointmentsByDay = (() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((app) => {
      if (app.status === 'CANCELLED') return;
      const parsed = new Date(app.scheduledDate);
      if (Number.isNaN(parsed.getTime())) return;
      const key = `${parsed.getFullYear()}-${parsed.getMonth() + 1}-${parsed.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(app);
    });
    return map;
  })();

  // For patient: track which days have the patient's own appointments
  const patientAppointmentsByDay = isPatient
    ? (() => {
        const map: Record<string, Appointment[]> = {};
        appointments.forEach((app) => {
          if (app.status === 'CANCELLED') return;
          if (app.patientId !== user?.patientId) return;
          const parsed = new Date(app.scheduledDate);
          if (Number.isNaN(parsed.getTime())) return;
          const key = `${parsed.getFullYear()}-${parsed.getMonth() + 1}-${parsed.getDate()}`;
          if (!map[key]) map[key] = [];
          map[key].push(app);
        });
        return map;
      })()
    : {};

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

  // ---- Dialog data ----
  const dateStr = selectedDay
    ? `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
    : '';

  const daySlots = selectedDay
    ? scheduleSlots.filter((s) => {
        if (!s.active) return false;
        const slotDate = s.date?.slice(0, 10);
        return slotDate === dateStr;
      })
    : [];

  const dayKey = selectedDay ? `${viewYear}-${viewMonth + 1}-${selectedDay}` : '';
  const dayApps = selectedDay && dayKey
    ? (isPatient
        ? (patientAppointmentsByDay[dayKey] ?? [])
        : (appointmentsByDay[dayKey] ?? []))
    : [];

  const handleGoToAppointments = () => {
    // Dispatch event for AppointmentsPage to open the new appointment modal
    window.dispatchEvent(new CustomEvent('calendar:goToAppointments'));
    setSelectedDay(null);
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-emerald-600" />Agenda de Atendimentos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Visão mensal dos agendamentos</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm px-2 py-1.5">
          <Button variant="ghost" size="sm" onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); } else setViewMonth(viewMonth - 1); }}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-medium text-slate-800 dark:text-slate-200 text-sm min-w-[130px] text-center">{capitalizedMonth}</span>
          <Button variant="ghost" size="sm" onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); } else setViewMonth(viewMonth + 1); }}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Card className="p-4 sm:p-6 glass-card">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((d) => (<div key={d} className="text-center text-xs font-semibold text-slate-400 tracking-wide py-2">{d}</div>))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            if (d === null) return <div key={i} className="aspect-square" />;
            const key = `${viewYear}-${viewMonth + 1}-${d}`;
            const dayAppsCal = appointmentsByDay[key];
            const patientDayApps = isPatient ? patientAppointmentsByDay[key] : undefined;
            const hasOwnAppointment = patientDayApps && patientDayApps.length > 0;
            const todayCell = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === d;
            return (
              <div
                key={i}
                onClick={() => setSelectedDay(d)}
                className={`aspect-square rounded-xl p-2 flex flex-col items-start text-left border transition-all hover:shadow-md hover:scale-105 cursor-pointer ${
                  todayCell
                    ? 'animate-glow-pulse border-emerald-300 bg-emerald-50/80 dark:bg-emerald-900/20'
                    : hasOwnAppointment
                      ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/60 dark:bg-emerald-900/15 hover:border-emerald-300 dark:hover:border-emerald-500'
                      : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                }`}
              >
                <span className={`text-sm font-medium ${todayCell ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-slate-800 dark:text-slate-200'}`}>{d}</span>
                {/* Patient indicator: green dot for own appointments */}
                {isPatient && hasOwnAppointment && (
                  <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />
                )}
                {dayAppsCal && dayAppsCal.length > 0 && (
                  <div className="mt-auto flex gap-0.5 flex-wrap">
                    {(isPatient ? patientDayApps : dayAppsCal)!.slice(0, 3).map((app) => (
                      <span key={app.id} className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-medium shrink-0 ${app.status === 'PENDING' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : app.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                        <Clock className="w-2 h-2" />{app.scheduledTime || ''}
                      </span>
                    ))}
                    {(isPatient ? (patientDayApps?.length ?? 0) : dayAppsCal.length) > 3 && <span className="text-[9px] text-slate-400 font-medium">+{(isPatient ? (patientDayApps?.length ?? 0) : dayAppsCal.length) - 3}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Day Click Dialog */}
      <Dialog open={selectedDay !== null} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="rounded-2xl max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-emerald-600" />
              {selectedDay}/{viewMonth + 1}/{viewYear}
            </DialogTitle>
            <DialogDescription>Horários e agendamentos do dia</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Available Slots — show for non-patient or patient without appointment */}
            {(!isPatient || dayApps.length === 0) && (
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Horários Disponíveis</h4>
                {daySlots.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhum horário configurado para este dia.</p>
                ) : (
                  <div className="space-y-1.5">
                    {daySlots.map((slot) => (
                      <div key={slot.id} className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{slot.timeSlot}</span>
                          {slot.assignedTo && <span className="text-xs text-slate-400">{slot.assignedTo.name}</span>}
                        </div>
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                          {slot.maxCapacity - (slot._count?.appointments ?? 0)} vagas
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {(!isPatient || dayApps.length === 0) && daySlots.length > 0 && <Separator />}

            {/* Existing Appointments */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {isPatient ? 'Seus Agendamentos' : 'Agendamentos'}
              </h4>
              {dayApps.length === 0 ? (
                <p className="text-sm text-slate-400">
                  {isPatient ? 'Nenhum agendamento seu neste dia.' : 'Nenhum agendamento neste dia.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {dayApps.map((app) => (
                    <div key={app.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{app.patient?.name ?? 'Paciente'}</p>
                        <p className="text-xs text-slate-400">{app.scheduledTime} • {app.items?.[0]?.medicine?.name ?? ''}</p>
                      </div>
                      <Badge variant="outline" className={APPOINTMENT_STATUS_STYLES[app.status] || ''}>
                        {APPOINTMENT_STATUS_LABELS[app.status] || app.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Patient: note about creating appointment */}
            {isPatient && dayApps.length === 0 && (
              <div className="pt-2">
                <p className="text-xs text-slate-400 text-center">
                  Clique em &quot;Novo Agendamento&quot; na aba Agendamentos para agendar neste dia.
                </p>
              </div>
            )}

            {/* Admin/Farm: action button to go to appointments */}
            {isAdminOrFarm && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={handleGoToAppointments}
                  className="rounded-xl gap-2"
                >
                  <CalendarDays className="w-4 h-4" />Ir para Agendamentos
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
