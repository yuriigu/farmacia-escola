'use client';

import { useState, useEffect } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, User, Plus } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { usePharmacyStore, fetchScheduleSlotsData } from '@/lib/pharmacy-store';
import type { Appointment } from '@/lib/types';
import { APPOINTMENT_STATUS_STYLES, APPOINTMENT_STATUS_LABELS } from '@/lib/constants';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

export function AppointmentsOverviewPage() {
  const { appointments, scheduleSlots } = usePharmacyStore();
  const user = useAuthStore((s) => s.user);
  const isPatient = user?.role === 'PACIENTE';
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

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
    window.dispatchEvent(new CustomEvent('calendar:goToAppointments'));
    setSelectedDay(null);
  };

  return (
    <div className="space-y-5 page-enter">
      {/* Standardized PageHeader */}
      <PageHeader
        title="Agenda Geral de Atendimentos"
        description="Calendário mensal de dispensações e acompanhamento das vagas disponíveis."
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
            <Button
              onClick={handleGoToAppointments}
              className="h-10 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm active:scale-[0.98] transition-transform"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Agendamento</span>
            </Button>
          </div>
        }
      />

      {/* Calendar Card */}
      <Card className="rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-5">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider py-1.5">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d, i) => {
            if (d === null) return <div key={i} className="aspect-square rounded-xl bg-slate-50/50 dark:bg-slate-900/20" />;
            const key = `${viewYear}-${viewMonth + 1}-${d}`;
            const dayAppsCal = appointmentsByDay[key];
            const patientDayApps = isPatient ? patientAppointmentsByDay[key] : undefined;
            const hasOwnAppointment = patientDayApps && patientDayApps.length > 0;
            const todayCell = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === d;
            return (
              <div
                key={i}
                onClick={() => setSelectedDay(d)}
                className={`min-h-[85px] rounded-xl p-2 flex flex-col justify-between border transition-all cursor-pointer hover:border-emerald-400 hover:shadow-xs ${
                  todayCell
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20 shadow-xs'
                    : hasOwnAppointment
                    ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold ${
                      todayCell ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {d}
                  </span>
                  {todayCell && (
                    <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                      Hoje
                    </span>
                  )}
                </div>

                {dayAppsCal && dayAppsCal.length > 0 && (
                  <div className="mt-1 flex gap-1 flex-wrap">
                    {(isPatient ? patientDayApps : dayAppsCal)!.slice(0, 3).map((app) => (
                      <span
                        key={app.id}
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-semibold ${
                          app.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200'
                            : app.status === 'CONFIRMED'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                        }`}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        {app.scheduledTime || ''}
                      </span>
                    ))}
                    {(isPatient ? patientDayApps?.length ?? 0 : dayAppsCal.length) > 3 && (
                      <span className="text-[9px] text-slate-400 font-bold">
                        +{(isPatient ? patientDayApps?.length ?? 0 : dayAppsCal.length) - 3}
                      </span>
                    )}
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
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <CalendarDays className="w-5 h-5 text-emerald-600" />
              {selectedDay}/{viewMonth + 1}/{viewYear}
            </DialogTitle>
            <DialogDescription>Horários disponíveis e agendamentos deste dia</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(!isPatient || dayApps.length === 0) && (
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Horários Disponíveis
                </h4>
                {daySlots.length === 0 ? (
                  <p className="text-xs text-slate-400">Nenhum horário configurado para este dia.</p>
                ) : (
                  <div className="space-y-1.5">
                    {daySlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-emerald-600" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {slot.timeSlot}
                          </span>
                          {slot.assignedTo && <span className="text-slate-400">({slot.assignedTo.name})</span>}
                        </div>
                        <Badge variant="outline" className="text-[10px] bg-white text-emerald-700 border-emerald-200">
                          {slot.maxCapacity - (slot._count?.appointments ?? 0)} vagas livres
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {dayApps.length > 0 && (
              <div>
                <Separator className="my-3" />
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  {isPatient ? 'Seus Agendamentos' : 'Agendamentos Marcados'} ({dayApps.length})
                </h4>
                <div className="space-y-2">
                  {dayApps.map((app) => {
                    const statusStyle = APPOINTMENT_STATUS_STYLES[app.status];
                    const statusCfg = typeof statusStyle === 'string'
                      ? {
                          label: app.status,
                          bg: statusStyle,
                          text: 'text-slate-700',
                          border: 'border-slate-200',
                        }
                      : statusStyle || {
                          label: app.status,
                          bg: 'bg-slate-100',
                          text: 'text-slate-700',
                          border: 'border-slate-200',
                        };

                    return (
                      <div
                        key={app.id}
                        className="p-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {app.scheduledTime || 'Horário a definir'}
                            </span>
                            <Badge
                              variant="outline"
                              className={`${statusCfg.bg} ${statusCfg.text} text-[10px]`}
                            >
                              {APPOINTMENT_STATUS_LABELS[app.status] || app.status}
                            </Badge>
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 mt-1">
                            Paciente: <strong className="text-slate-800 dark:text-slate-200">{app.patient?.name || 'Não informado'}</strong>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button onClick={handleGoToAppointments} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                Ir para Agendamentos
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}