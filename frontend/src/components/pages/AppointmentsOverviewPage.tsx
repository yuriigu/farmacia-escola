'use client';

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { CalendarDays, Clock, Plus } from 'lucide-react';
import { useAuthStore } from '@/lib/AuthStore';
import { usePharmacyStore, fetchScheduleSlotsData } from '@/lib/PharmacyStore';
import type { Appointment } from '@/lib/Types';
import { APPOINTMENT_STATUS_STYLES, APPOINTMENT_STATUS_LABELS } from '@/lib/Constants';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { Separator } from '@/components/ui/Separator';

const FullCalendar = dynamic(() => import('@fullcalendar/react'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[500px] flex items-center justify-center text-slate-400 text-sm">
      Carregando calendário...
    </div>
  ),
}) as any;

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

  const calendarEvents = (() => {
    const list: any[] = [];
    appointments.forEach((app) => {
      if (app.status === 'CANCELLED') {
        return;
      }
      if (isPatient) {
        if (user) {
          if (app.patientId !== user.patientId) {
            return;
          }
        } else {
          return;
        }
      }
      let patientName = 'Paciente';
      if (app.patient) {
        if (app.patient.name) {
          patientName = app.patient.name;
        }
      }
      let timeText = '';
      if (app.scheduledTime) {
        timeText = app.scheduledTime;
      }
      let title = patientName;
      if (timeText) {
        title = timeText + ' - ' + patientName;
      }

      let eventColor = '#059669';
      if (app.status === 'PENDING') {
        eventColor = '#d97706';
      } else if (app.status === 'CONFIRMED') {
        eventColor = '#059669';
      } else {
        eventColor = '#475569';
      }

      let dateIso = '';
      if (app.scheduledDate) {
        dateIso = app.scheduledDate.slice(0, 10);
      }

      list.push({
        id: app.id,
        title: title,
        date: dateIso,
        backgroundColor: eventColor,
        borderColor: eventColor,
        textColor: '#ffffff',
        extendedProps: {
          appointment: app,
        },
      });
    });
    return list;
  })();

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

  const handleDateClick = (info: { dateStr: string }) => {
    if (info) {
      if (info.dateStr) {
        const parts = info.dateStr.split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2], 10);
          setViewYear(y);
          setViewMonth(m);
          setSelectedDay(d);
        }
      }
    }
  };

  const handleEventClick = (info: { event: { startStr: string } }) => {
    if (info) {
      if (info.event) {
        if (info.event.startStr) {
          const dateOnly = info.event.startStr.slice(0, 10);
          const parts = dateOnly.split('-');
          if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            setViewYear(y);
            setViewMonth(m);
            setSelectedDay(d);
          }
        }
      }
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto page-enter">
      {/* Standardized PageHeader */}
      <PageHeader
        title="Agenda Geral de Atendimentos"
        description="Calendário mensal de dispensações e acompanhamento das vagas disponíveis."
        icon={CalendarDays}
        actions={
          <Button
            onClick={handleGoToAppointments}
            className="h-10 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm active:scale-[0.98] transition-transform"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Agendamento</span>
          </Button>
        }
      />

      {/* Calendar Card */}
      <Card className="rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-5 bg-white dark:bg-slate-800">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listMonth',
          }}
          buttonText={{
            today: 'Hoje',
            month: 'Mês',
            week: 'Semana',
            list: 'Lista',
          }}
          events={calendarEvents}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          height="auto"
          dayMaxEvents={3}
          moreLinkText={(n) => `+${n}`}
        />
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
