'use client';

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, User, Plus } from 'lucide-react';
import { useAuthStore } from '@/lib/AuthStore';
import { usePharmacyStore, fetchScheduleSlotsData } from '@/lib/PharmacyStore';
import type { Appointment } from '@/lib/Types';
import { APPOINTMENT_STATUS_STYLES, APPOINTMENT_STATUS_LABELS } from '@/lib/Constants';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { Separator } from '@/components/ui/Separator';

export function AppointmentsOverviewPage() {
  const { appointments, scheduleSlots } = usePharmacyStore();
  const user = useAuthStore((s) => {
    return s.user;
  });
  let isPatient = false;
  if (user) {
    if (user.role === 'PACIENTE') {
      isPatient = true;
    } else {
      isPatient = false;
    }
  } else {
    isPatient = false;
  }

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
      if (app.status === 'CANCELLED') {
        return;
      }
      const parsed = new Date(app.scheduledDate);
      if (Number.isNaN(parsed.getTime())) {
        return;
      }
      const key = `${parsed.getFullYear()}-${parsed.getMonth() + 1}-${parsed.getDate()}`;
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(app);
    });
    return map;
  })();

  let patientAppointmentsByDay: Record<string, Appointment[]> = {};
  if (isPatient) {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((app) => {
      if (app.status === 'CANCELLED') {
        return;
      }
      if (user) {
        if (app.patientId !== user.patientId) {
          return;
        }
      } else {
        return;
      }
      const parsed = new Date(app.scheduledDate);
      if (Number.isNaN(parsed.getTime())) {
        return;
      }
      const key = `${parsed.getFullYear()}-${parsed.getMonth() + 1}-${parsed.getDate()}`;
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(app);
    });
    patientAppointmentsByDay = map;
  }

  const buildMonthDays = (year: number, month: number) => {
    const first = new Date(year, month, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(d);
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    return cells;
  };

  const days = buildMonthDays(viewYear, viewMonth);
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const capitalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  let dateStr = '';
  if (selectedDay) {
    dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  }

  let daySlots: typeof scheduleSlots = [];
  if (selectedDay) {
    daySlots = scheduleSlots.filter((s) => {
      if (!s.active) {
        return false;
      }
      let slotDate = '';
      if (s.date) {
        slotDate = s.date.slice(0, 10);
      }
      if (slotDate === dateStr) {
        return true;
      }
      return false;
    });
  }

  let dayKey = '';
  if (selectedDay) {
    dayKey = `${viewYear}-${viewMonth + 1}-${selectedDay}`;
  }

  let dayApps: Appointment[] = [];
  if (selectedDay) {
    if (dayKey) {
      if (isPatient) {
        if (patientAppointmentsByDay[dayKey]) {
          dayApps = patientAppointmentsByDay[dayKey];
        } else {
          dayApps = [];
        }
      } else {
        if (appointmentsByDay[dayKey]) {
          dayApps = appointmentsByDay[dayKey];
        } else {
          dayApps = [];
        }
      }
    }
  }

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
                  } else {
                    setViewMonth(viewMonth - 1);
                  }
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
                  } else {
                    setViewMonth(viewMonth + 1);
                  }
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
            if (d === null) {
              return <div key={i} className="aspect-square rounded-xl bg-slate-50/50 dark:bg-slate-900/20" />;
            }
            const key = `${viewYear}-${viewMonth + 1}-${d}`;
            const dayAppsCal = appointmentsByDay[key];

            let patientDayApps: Appointment[] | undefined = undefined;
            if (isPatient) {
              patientDayApps = patientAppointmentsByDay[key];
            } else {
              patientDayApps = undefined;
            }

            let hasOwnAppointment = false;
            if (patientDayApps) {
              if (patientDayApps.length > 0) {
                hasOwnAppointment = true;
              }
            }

            let todayCell = false;
            if (today.getFullYear() === viewYear) {
              if (today.getMonth() === viewMonth) {
                if (today.getDate() === d) {
                  todayCell = true;
                }
              }
            }

            let cellBorderBg = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800';
            if (todayCell) {
              cellBorderBg = 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20 shadow-xs';
            } else if (hasOwnAppointment) {
              cellBorderBg = 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20';
            } else {
              cellBorderBg = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800';
            }

            let dayTextClass = 'text-slate-700 dark:text-slate-300';
            if (todayCell) {
              dayTextClass = 'text-emerald-700 dark:text-emerald-400';
            } else {
              dayTextClass = 'text-slate-700 dark:text-slate-300';
            }

            let appListToRender: Appointment[] = [];
            if (isPatient) {
              if (patientDayApps) {
                appListToRender = patientDayApps;
              }
            } else {
              if (dayAppsCal) {
                appListToRender = dayAppsCal;
              }
            }

            let totalCalApps = 0;
            if (isPatient) {
              if (patientDayApps) {
                totalCalApps = patientDayApps.length;
              }
            } else {
              if (dayAppsCal) {
                totalCalApps = dayAppsCal.length;
              }
            }

            return (
              <div
                key={i}
                onClick={() => setSelectedDay(d)}
                className={'min-h-[85px] rounded-xl p-2 flex flex-col justify-between border transition-all cursor-pointer hover:border-emerald-400 hover:shadow-xs ' + cellBorderBg}
              >
                <div className="flex items-center justify-between">
                  <span className={'text-xs font-bold ' + dayTextClass}>
                    {d}
                  </span>
                  {(() => {
                    if (todayCell) {
                      return (
                        <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                          Hoje
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>

                {(() => {
                  if (dayAppsCal) {
                    if (dayAppsCal.length > 0) {
                      return (
                        <div className="mt-1 flex gap-1 flex-wrap">
                          {appListToRender.slice(0, 3).map((app) => {
                            let badgeStyle = 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400';
                            if (app.status === 'PENDING') {
                              badgeStyle = 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200';
                            } else if (app.status === 'CONFIRMED') {
                              badgeStyle = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200';
                            } else {
                              badgeStyle = 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400';
                            }

                            let appTime = '';
                            if (app.scheduledTime) {
                              appTime = app.scheduledTime;
                            }

                            return (
                              <span
                                key={app.id}
                                className={'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-semibold ' + badgeStyle}
                              >
                                <Clock className="w-2.5 h-2.5" />
                                {appTime}
                              </span>
                            );
                          })}
                          {(() => {
                            if (totalCalApps > 3) {
                              return (
                                <span className="text-[9px] text-slate-400 font-bold">
                                  +{totalCalApps - 3}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      );
                    }
                  }
                  return null;
                })()}
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
            {(() => {
              let showSlotsSection = false;
              if (!isPatient) {
                showSlotsSection = true;
              } else if (dayApps.length === 0) {
                showSlotsSection = true;
              }

              if (showSlotsSection) {
                return (
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Horários Disponíveis
                    </h4>
                    {(() => {
                      if (daySlots.length === 0) {
                        return <p className="text-xs text-slate-400">Nenhum horário configurado para este dia.</p>;
                      } else {
                        return (
                          <div className="space-y-1.5">
                            {daySlots.map((slot) => {
                              let countAppointments = 0;
                              if (slot._count) {
                                if (slot._count.appointments) {
                                  countAppointments = slot._count.appointments;
                                }
                              }
                              const freeSlots = slot.maxCapacity - countAppointments;

                              let assignedName: ReactNode = null;
                              if (slot.assignedTo) {
                                if (slot.assignedTo.name) {
                                  assignedName = <span className="text-slate-400">({slot.assignedTo.name})</span>;
                                }
                              }

                              return (
                                <div
                                  key={slot.id}
                                  className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800 text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-emerald-600" />
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                      {slot.timeSlot}
                                    </span>
                                    {assignedName}
                                  </div>
                                  <Badge variant="outline" className="text-[10px] bg-white text-emerald-700 border-emerald-200">
                                    {freeSlots} vagas livres
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }
                    })()}
                  </div>
                );
              }
              return null;
            })()}

            {(() => {
              if (dayApps.length > 0) {
                let sectionTitle = 'Agendamentos Marcados';
                if (isPatient) {
                  sectionTitle = 'Seus Agendamentos';
                } else {
                  sectionTitle = 'Agendamentos Marcados';
                }

                return (
                  <div>
                    <Separator className="my-3" />
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      {sectionTitle} ({dayApps.length})
                    </h4>
                    <div className="space-y-2">
                      {dayApps.map((app) => {
                        const statusStyle = APPOINTMENT_STATUS_STYLES[app.status];
                        let statusCfg = {
                          label: app.status,
                          bg: 'bg-slate-100',
                          text: 'text-slate-700',
                          border: 'border-slate-200',
                        };

                        if (typeof statusStyle === 'string') {
                          statusCfg = {
                            label: app.status,
                            bg: statusStyle,
                            text: 'text-slate-700',
                            border: 'border-slate-200',
                          };
                        } else if (statusStyle) {
                          statusCfg = statusStyle;
                        }

                        let schedTimeText = 'Horário a definir';
                        if (app.scheduledTime) {
                          schedTimeText = app.scheduledTime;
                        }

                        let appStatusLabel: string = app.status;
                        if (APPOINTMENT_STATUS_LABELS[app.status]) {
                          appStatusLabel = APPOINTMENT_STATUS_LABELS[app.status];
                        }

                        let patientNameText = 'Não informado';
                        if (app.patient) {
                          if (app.patient.name) {
                            patientNameText = app.patient.name;
                          }
                        }

                        return (
                          <div
                            key={app.id}
                            className="p-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-xs flex items-center justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {schedTimeText}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`${statusCfg.bg} ${statusCfg.text} text-[10px]`}
                                >
                                  {appStatusLabel}
                                </Badge>
                              </div>
                              <p className="text-slate-600 dark:text-slate-400 mt-1">
                                Paciente: <strong className="text-slate-800 dark:text-slate-200">{patientNameText}</strong>
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

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