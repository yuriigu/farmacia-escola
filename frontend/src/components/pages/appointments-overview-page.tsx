'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { CalendarDays, Clock, Plus, Eye, Check, CheckCheck, X, Download } from 'lucide-react';
import { toast } from '@/lib/toast-handler';
import { useAuthStore } from '@/lib/auth-store';
import { usePermission } from '@/hooks/use-permission';
import {
  usePharmacyStore,
  fetchAppointmentsData,
  fetchBatchesData,
  fetchMedicinesData,
  fetchScheduleSlotsData,
} from '@/lib/pharmacy-store';
import type { Appointment } from '@/types';
import { APPOINTMENT_STATUS_STYLES, APPOINTMENT_STATUS_LABELS } from '@/lib/constants';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { downloadCSV } from '@/lib/constants';
import { formatDateKeyBr, todayKeyLocal, toDateKey } from '@/lib/dates';
import { StandardCalendar } from '@/components/shared/standard-calendar';
import { AppointmentDetailsModal } from '@/components/modals/appointment-details-modal';

// pagina de visao geral da agenda. e a aba 'agenda' do modulo de
// calendario: mostra um calendario mensal com todos os agendamentos,
// permite clicar num dia pra ver slots disponiveis e consultas
// marcadas, e dispara acoes de confirmar/concluir/cancelar.
// e a versao mais 'visual' do modulo, complementando a listagem
// crua da appointmentspage.
export function AppointmentsOverviewPage() {
  const { appointments, scheduleSlots } = usePharmacyStore();
  const user = useAuthStore((s) => {
    return s.user;
  });

  // determina se o usuario logado e paciente/medico. medico usa fluxo
  // proprio de prescricao e nao altera status; paciente so cancela.
  let isPatient = false;
  let isMedico = false;
  if (user) {
    if (user.role === 'PACIENTE') {
      isPatient = true;
    } else {
      isPatient = false;
    }
    if (user.role === 'MEDICO') {
      isMedico = true;
    } else {
      isMedico = false;
    }
  } else {
    isPatient = false;
    isMedico = false;
  }

  // permissao granular de alteracao de status (confirmar/concluir).
  // o backend (role-middleware) concede APPOINTMENTS_UPDATE apenas a
  // ADMIN, FARMACEUTICO e ALUNO — PACIENTE e MEDICO ficam sem acesso.
  // mantemos tambem as travas explicitas de papel porque o
  // canWriteClient do frontend ainda libera 'appointments' para
  // MEDICO/PACIENTE (escrita ampla), o que nao reflete o UPDATE real.
  const canUpdateAppointment = usePermission('APPOINTMENTS_UPDATE');
  const canManageAppointmentStatus = canUpdateAppointment && !isPatient && !isMedico;

  // estado do calendario: mes/ano em exibicao, dia selecionado
  // (abre o modal de detalhe) e dialogs de detalhe/cancelamento/comprovante.
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [receipt, setReceipt] = useState<any>(null);

  // agrupa todos os agendamentos por dia (chave y-m-d) pra achar
  // rapidamente o que tem em cada dia. a chave segue o mesmo padrao
  // usado na renderizacao do dia selecionado.
  const appointmentsByDay = (() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((app) => {
      const key = toDateKey(app.scheduledDate);
      if (!key) {
        return;
      }
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(app);
    });
    return map;
  })();

  // versao filtrada do mapa acima, so com os agendamentos do proprio
  // paciente. usada quando o usuario logado e paciente.
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
      const key = toDateKey(app.scheduledDate);
      if (!key) {
        return;
      }
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(app);
    });
    patientAppointmentsByDay = map;
  }

  // converte os agendamentos pro formato de eventos que o
  // standardcalendar espera. a cor do evento muda conforme o status:
  // laranja pra pendente, azul pra confirmado, vermelho pra cancelado
  // e verde pro resto (concluido).
  const calendarEvents = (() => {
    const list: any[] = [];
    appointments.forEach((app) => {
      // paciente so ve os proprios eventos no calendario.
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
        dateIso = toDateKey(app.scheduledDate);
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

  // lista os agendamentos visiveis no contexto atual (paciente so os
  // dele; equipe ve tudo). usada pra exportacao csv.
  const visibleAppointments = appointments.filter((app) => {
    if (!isPatient) {
      return true;
    }
    if (!user) {
      return false;
    }
    return app.patientId === user.patientId;
  });

  // exporta em csv os agendamentos visiveis. hoje o botao nao esta
  // limitado por papel, mas o escopo do dado ja respeita ispatient.
  const handleExportCSV = () => {
    const header = ['Paciente', 'CPF', 'Data Agendada', 'Horário', 'Status', 'Medicamento(s)', 'Observações'];
    const rows = visibleAppointments.map((app) => {
      let patientName = 'Não informado';
      if (app.patient) {
        if (app.patient.name) {
          patientName = app.patient.name;
        }
      } else if (isPatient) {
        if (user) {
          if (user.name) {
            patientName = user.name;
          }
        }
      }

      let patientCpf = '—';
      if (app.patient) {
        if (app.patient.cpf) {
          patientCpf = app.patient.cpf;
        }
      }

      let dateLabel = '—';
      const dateKey = toDateKey(app.scheduledDate);
      if (dateKey) {
        dateLabel = formatDateKeyBr(dateKey);
      }

      let timeLabel = '—';
      if (app.scheduledTime) {
        timeLabel = app.scheduledTime;
      }

      let statusLabel: string = app.status;
      if (APPOINTMENT_STATUS_LABELS[app.status]) {
        statusLabel = APPOINTMENT_STATUS_LABELS[app.status];
      }

      let medNames = 'Nenhum';
      if (app.items) {
        if (app.items.length > 0) {
          medNames = app.items.map((item) => {
            let itemName = 'Sem nome';
            if (item.medicine) {
              if (item.medicine.name) {
                itemName = item.medicine.name;
              }
            }
            return itemName;
          }).join('; ');
        }
      }

      let notes = '';
      if (app.notes) {
        notes = app.notes;
      }

      return [patientName, patientCpf, dateLabel, timeLabel, statusLabel, medNames, notes];
    });
    downloadCSV('agendamentos_' + todayKeyLocal() + '.csv', [header, ...rows]);
    toast.success('Agendamentos exportados com sucesso!');
  };

  // resolve a data (yyyy-mm-dd) do dia selecionado, baseada no
  // viewyear/viewmonth atuais. usada pra filtrar slots do dia.
  let dateStr = '';
  if (selectedDay) {
    dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  }

  // slots ativos naquele dia. a comparacao e so pela parte da data
  // (slice 0,10) porque o slot guarda data com hora.
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

  const dayKey = dateStr;

  // resolve os agendamentos do dia selecionado. paciente ve so os
  // dele (via patientappointmentsbyday); equipe ve todos.
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

  // dispara o evento customizado que troca o modulocalendario pra
  // aba 'agendamentos'. opcionalmente passa detalhe (data, hora,
  // slotid) pra pre-preencher o formulario de criacao.
  const handleGoToAppointments = (slot?: { date: string; timeSlot: string; id: number }) => {
    let detail: { date?: string; time?: string; slotId?: number } = {};
    if (slot) {
      detail = { date: slot.date.slice(0, 10), time: slot.timeSlot, slotId: slot.id };
    }
    window.dispatchEvent(new CustomEvent('calendar:goToAppointments', { detail }));
    setSelectedDay(null);
  };

  // clicar num dia do calendario abre o modal daquele dia.
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

  // clicar num evento do calendario tambem abre o modal do dia
  // correspondente.
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
      {/* cabecalho com acoes de exportar csv e novo agendamento */}
      <PageHeader
        title="Agenda Geral de Atendimentos"
        description="Calendário mensal de dispensações e acompanhamento das vagas disponíveis."
        icon={CalendarDays}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={visibleAppointments.length === 0}
              className="h-10 rounded-xl gap-2 text-sm font-medium border-slate-200 dark:border-slate-700"
            >
              <Download className="w-4 h-4" />
              <span>Exportar CSV</span>
            </Button>
            <Button
              onClick={() => handleGoToAppointments()}
            >
              <Plus className="w-4 h-4" />
              <span>Novo Agendamento</span>
            </Button>
          </div>
        }
      />

      {/* legenda de cores do calendario */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs dark:border-slate-700 dark:bg-slate-800" aria-label="Legenda de status">
        <span className="font-semibold text-slate-600 dark:text-slate-300">Legenda:</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" />Pendente</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" />Confirmado</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-600" />Concluído (Dispensado)</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-600" />Cancelado</span>
      </div>

      {/* card com o calendario padrao. os callbacks tratam clique em
          dia e clique em evento, ambos abrindo o modal do dia. */}
      <Card className="rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-5 bg-white dark:bg-slate-800">
        <StandardCalendar
          events={calendarEvents}
          onDateClick={handleDateClick}
          onEventClick={handleEventClick}
        />
      </Card>

      {/* modal do dia selecionado: lista slots disponiveis e os
          agendamentos marcados, com acoes contextuais. */}
      <Dialog open={selectedDay !== null} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="rounded-2xl sm:max-w-xl max-h-[80vh] overflow-x-hidden overflow-y-auto overscroll-contain dialog-scroll">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <CalendarDays className="w-5 h-5 text-emerald-600" />
              {selectedDay}/{viewMonth + 1}/{viewYear}
            </DialogTitle>
            <DialogDescription>Horários disponíveis e agendamentos deste dia</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* secao de slots disponiveis. mostra pra equipe sempre,
                e pro paciente so quando ele nao tem agendamento no dia
                (pra ele ver a possibilidade de marcar). */}
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
                              // calcula vagas livres a partir do count
                              // de agendamentos ativos e da capacidade.
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
                                  {/* botao de agendar so aparece quando
                                      ainda tem vaga. */}
                                  {(() => {
                                    if (freeSlots > 0) {
                                      return <Button onClick={() => handleGoToAppointments(slot)} size="xs">Agendar</Button>;
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

            {/* secao de agendamentos do dia, com acoes contextuais
                por status (visualizar, confirmar, concluir, cancelar). */}
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
                        // resolve estilo/label do status. aceita tanto
                        // string quanto objeto de config.
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
                            <div className="flex items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
                              <Button variant="ghost" size="sm" title="Visualizar" onClick={() => setSelectedAppointment(app)}><Eye className="h-4 w-4" /></Button>
                              {/* confirmar: so pra equipe autorizada (APPOINTMENTS_UPDATE: ADMIN/FARMACEUTICO/ALUNO), so quando pending */}
                              {(() => {
                                if (canManageAppointmentStatus) {
                                  if (app.status === 'PENDING') {
                                    return (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        title="Confirmar Agendamento"
                                        aria-label="Confirmar Agendamento"
                                        onClick={async () => {
                                          await api.confirmAppointment(app.id);
                                          toast.success('Agendamento confirmado.');
                                          void fetchAppointmentsData();
                                          void fetchScheduleSlotsData();
                                        }}
                                        className="h-8 w-8 p-0 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-900/30"
                                      >
                                        <Check className="h-4 w-4" />
                                      </Button>
                                    );
                                  }
                                }
                                return null;
                              })()}
                              {/* concluir: efetiva atendimento e dispensa
                                  via fefo. so pra equipe autorizada
                                  (APPOINTMENTS_UPDATE), quando
                                  pending ou confirmed. */}
                              {(() => {
                                if (canManageAppointmentStatus) {
                                  // concluir e a acao final: efetiva o atendimento e a dispensacao.
                                  let canComplete = false;
                                  if (app.status === 'PENDING') {
                                    canComplete = true;
                                  } else if (app.status === 'CONFIRMED') {
                                    canComplete = true;
                                  }
                                  if (canComplete) {
                                    return (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        title="Concluir Agendamento"
                                        aria-label="Concluir Agendamento"
                                        onClick={async () => {
                                          try {
                                            // aqui chamamos o cliente http
                                            // (/lib/api.ts) pra concluir. a
                                            // resposta traz os lotes
                                            // consumidos e vira o comprovante.
                                            const withdrawal = await api.completeAppointment(app.id);
                                            setReceipt(withdrawal);
                                            toast.success('Atendimento concluído e dispensado.');
                                            void fetchAppointmentsData();
                                            void fetchScheduleSlotsData();
                                            void fetchMedicinesData();
                                            void fetchBatchesData();
                                          } catch (err: unknown) {
                                            const error = err as { message?: string };
                                            let errorMsg = 'Erro ao concluir atendimento.';
                                            if (error) {
                                              if (error.message) {
                                                errorMsg = error.message;
                                              }
                                            }
                                            toast.error(errorMsg);
                                          }
                                        }}
                                        className="h-8 w-8 p-0 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-900/30"
                                      >
                                        <CheckCheck className="h-4 w-4" />
                                      </Button>
                                    );
                                  }
                                }
                                return null;
                              })()}
                              {/* cancelar: paciente tambem pode (a
                                  autorizacao real fica no backend),
                                  desde que nao esteja ja cancelado. */}
                              {(() => {
                                if (app.status !== 'CANCELLED') {
                                  return (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      title="Cancelar"
                                      onClick={() => {
                                        setCancelTarget(app);
                                        setCancelReason('');
                                      }}
                                    >
                                      <X className="h-4 w-4 text-red-600" />
                                    </Button>
                                  );
                                }
                                return null;
                              })()}
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
              <Button onClick={() => handleGoToAppointments()} size="sm">
                Ir para Agendamentos
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* modal de detalhe do agendamento selecionado (olhinho), agora
          compartilhado com o modulo /appointments. */}
      <AppointmentDetailsModal
        appointment={selectedAppointment}
        onOpenChange={(open) => { if (!open) setSelectedAppointment(null); }}
        onComplete={(withdrawal) => setReceipt(withdrawal)}
      />

      {/* modal de cancelamento: exige motivo antes de liberar a vaga. */}
      <Dialog open={cancelTarget !== null} onOpenChange={(open) => { if (!open) setCancelTarget(null); }}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader><DialogTitle>Cancelar Agendamento</DialogTitle><DialogDescription>O motivo é obrigatório para liberar a vaga.</DialogDescription></DialogHeader>
          <Textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Motivo do Cancelamento" rows={4} required />
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setCancelTarget(null)}>Voltar</Button><Button variant="destructive" onClick={async () => { if (!cancelTarget || !cancelReason.trim()) { toast.error('Informe o motivo do cancelamento.'); return; } await api.cancelAppointment(cancelTarget.id, cancelReason); setCancelTarget(null); toast.success('Agendamento cancelado.'); }}>Cancelar agendamento</Button></div>
        </DialogContent>
      </Dialog>

      {/* modal de comprovante de retirada, exibido apos conclusao. */}
      <Dialog open={receipt !== null} onOpenChange={(open) => { if (!open) setReceipt(null); }}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader><DialogTitle>Comprovante de Retirada</DialogTitle><DialogDescription>Baixa FEFO concluída para o atendimento.</DialogDescription></DialogHeader>
          <div className="space-y-2 text-sm"><p>Paciente: {receipt?.patient?.name ?? 'Não informado'}</p><p>Lote consumido: {receipt?.batch?.batchNumber ?? receipt?.allocatedItems?.map((item: { batchNumber: string }) => item.batchNumber).join(', ') ?? 'Baixa FEFO registrada'}</p></div>
          <div className="flex justify-end"><Button variant="outline" onClick={() => setReceipt(null)}>Fechar</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}