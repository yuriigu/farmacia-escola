'use client';

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { CalendarDays, Clock, Plus, Eye, Check, CircleCheckBig, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth-store';
import { usePharmacyStore, fetchScheduleSlotsData } from '@/lib/pharmacy-store';
import type { Appointment } from '@/lib/types';
import { APPOINTMENT_STATUS_STYLES, APPOINTMENT_STATUS_LABELS } from '@/lib/constants';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { StandardCalendar } from '@/components/shared/standard-calendar';

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
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [receipt, setReceipt] = useState<any>(null);

  useEffect(() => {
    fetchScheduleSlotsData();
  }, []);

  const appointmentsByDay = (() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((app) => {
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

      let eventColor = '#16a34a';
      if (app.status === 'PENDING') {
        eventColor = '#f97316';
      } else if (app.status === 'CONFIRMED') {
        eventColor = '#2563eb';
      } else if (app.status === 'CANCELLED') {
        eventColor = '#dc2626';
      } else {
        eventColor = '#16a34a';
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

  const handleGoToAppointments = (slot?: { date: string; timeSlot: string; id: number }) => {
    let detail: { date?: string; time?: string; slotId?: number } = {};
    if (slot) {
      detail = { date: slot.date.slice(0, 10), time: slot.timeSlot, slotId: slot.id };
    }
    window.dispatchEvent(new CustomEvent('calendar:goToAppointments', { detail }));
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
            onClick={() => handleGoToAppointments()}
            className="h-10 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm active:scale-[0.98] transition-transform"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Agendamento</span>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs dark:border-slate-700 dark:bg-slate-800" aria-label="Legenda de status">
        <span className="font-semibold text-slate-600 dark:text-slate-300">Legenda:</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" />Pendente</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" />Confirmado</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-600" />Concluído (Dispensado)</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-600" />Cancelado</span>
      </div>

      {/* Calendar Card */}
      <Card className="rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-5 bg-white dark:bg-slate-800">
        <StandardCalendar
          events={calendarEvents}
          onDateClick={handleDateClick}
          onEventClick={handleEventClick}
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
                                  {(() => {
                                    if (freeSlots > 0) {
                                      return <Button onClick={() => handleGoToAppointments(slot)} className="h-7 rounded-lg bg-emerald-600 px-2 text-[10px] text-white">Agendar</Button>;
                                    }
                                    return null;
                                  })()}
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
                            <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
                              <Button variant="ghost" size="sm" title="Visualizar" onClick={() => setSelectedAppointment(app)}><Eye className="h-4 w-4" /></Button>
                              {!isPatient && app.status === 'PENDING' && <Button variant="ghost" size="sm" title="Confirmar" onClick={async () => { await api.confirmAppointment(app.id); toast.success('Agendamento confirmado.'); fetchScheduleSlotsData(); }}><Check className="h-4 w-4 text-blue-600" /></Button>}
                              {!isPatient && app.status === 'CONFIRMED' && <Button variant="ghost" size="sm" title="Concluir/Dispensar" onClick={async () => { const withdrawal = await api.completeAppointment(app.id); setReceipt(withdrawal); toast.success('Atendimento concluído e dispensado.'); fetchScheduleSlotsData(); }}><CircleCheckBig className="h-4 w-4 text-green-600" /></Button>}
                              {app.status !== 'CANCELLED' && <Button variant="ghost" size="sm" title="Cancelar" onClick={() => { setCancelTarget(app); setCancelReason(''); }}><X className="h-4 w-4 text-red-600" /></Button>}
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
              <Button onClick={() => handleGoToAppointments()} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                Ir para Agendamentos
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedAppointment !== null} onOpenChange={(open) => { if (!open) setSelectedAppointment(null); }}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader><DialogTitle>Detalhes do Agendamento</DialogTitle><DialogDescription>Informações do atendimento selecionado.</DialogDescription></DialogHeader>
          {selectedAppointment && <div className="space-y-2 text-sm"><p>Paciente: <strong>{selectedAppointment.patient?.name ?? 'Não informado'}</strong></p><p>Status: {APPOINTMENT_STATUS_LABELS[selectedAppointment.status]}</p><p>Horário: {selectedAppointment.scheduledTime ?? 'Não informado'}</p></div>}
        </DialogContent>
      </Dialog>

      <Dialog open={cancelTarget !== null} onOpenChange={(open) => { if (!open) setCancelTarget(null); }}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader><DialogTitle>Cancelar Agendamento</DialogTitle><DialogDescription>O motivo é obrigatório para liberar a vaga.</DialogDescription></DialogHeader>
          <Textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Motivo do Cancelamento" rows={4} required />
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setCancelTarget(null)}>Voltar</Button><Button className="bg-red-600 text-white" onClick={async () => { if (!cancelTarget || !cancelReason.trim()) { toast.error('Informe o motivo do cancelamento.'); return; } await api.cancelAppointment(cancelTarget.id, cancelReason); setCancelTarget(null); toast.success('Agendamento cancelado.'); }}>Cancelar agendamento</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={receipt !== null} onOpenChange={(open) => { if (!open) setReceipt(null); }}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader><DialogTitle>Comprovante de Retirada</DialogTitle><DialogDescription>Baixa FEFO concluída para o atendimento.</DialogDescription></DialogHeader>
          <div className="space-y-2 text-sm"><p>Paciente: {receipt?.patient?.name ?? 'Não informado'}</p><p>Lote consumido: {receipt?.batch?.batchNumber ?? receipt?.allocatedItems?.map((item: { batchNumber: string }) => item.batchNumber).join(', ') ?? 'Baixa FEFO registrada'}</p></div>
          <div className="flex justify-end"><Button onClick={() => window.print()} className="bg-emerald-600 text-white">Imprimir/Salvar PDF</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
