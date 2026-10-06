'use client';

import { useState, useEffect, useMemo } from 'react';
import type { EventClickArg } from '@fullcalendar/core';
import { toast } from '@/lib/toast-handler';
import { CalendarDays, Plus, Trash2, Edit3, Clock, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { usePharmacyStore, fetchScheduleSlotsData } from '@/lib/pharmacy-store';
import { api } from '@/lib/api';
import { usePermission } from '@/hooks/use-permission';
import { todayKeyLocal } from '@/lib/dates';
import type { ScheduleSlot, User } from '@/types';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StandardCalendar } from '@/components/shared/standard-calendar';

// horarios fixos disponiveis na escala. o select do modal usa essa
// lista pra evitar que o operador digite horario fora do padrao.
const TIME_OPTIONS = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];

// pagina de escala de horarios. e a tela que configura os slots de
// atendimento: cada slot tem data, horario, capacidade maxima e
// farmaceutico responsavel. mostra um calendario mensal com os slots
// e um detalhamento em grade por dia. criar/editar/excluir so pra
// quem tem permissao de criar, editar ou excluir escalas.
export function ScheduleSlotsPage() {
  const user = useAuthStore((s) => s.user);
  const scheduleSlots = usePharmacyStore((s) => s.scheduleSlots);
  const [pharmacists, setPharmacists] = useState<User[]>([]);
  const canCreate = usePermission('SCHEDULES_CREATE');
  const canUpdate = usePermission('SCHEDULES_UPDATE');
  const canDelete = usePermission('SCHEDULES_DELETE');

  // estado do modal de criar/editar. o editslot indica o modo.
  const [modalOpen, setModalOpen] = useState(false);
  const [editSlot, setEditSlot] = useState<ScheduleSlot | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: '', timeSlot: '09:00', maxCapacity: 4, assignedToId: 0 });

  // carrega a lista de farmaceuticos pro select de responsavel.
  // so farmaceuticos aparecem, porque a escala e gerida por eles.
  useEffect(() => {
    api.getUsers().then((users) => {
      const responsibleUsers = users.filter((item) => item.role === 'FARMACEUTICO');
      setPharmacists(responsibleUsers);
    }).catch(() => {});
  }, []);

  // callback do calendario quando o mes visivel muda. recarrega os
  // slots com o filtro de periodo correspondente, pra nao trazer
  // meses que nem estao em tela.
  const handleDatesSet = (info: { startStr: string; endStr: string }) => {
    fetchScheduleSlotsData({
      startDate: info.startStr.slice(0, 10),
      endDate: info.endStr.slice(0, 10),
    }).catch(() => {});
  };

  // agrupa os slots por data (yyyy-mm-dd) pra montar o detalhamento
  // embaixo do calendario. cada chave e um dia, cada valor e a lista
  // de horarios daquele dia.
  const slotsByDate = useMemo(() => {
    const map: Record<string, ScheduleSlot[]> = {};
    scheduleSlots.forEach((s) => {
      const dateKey = s.date.split('T')[0];
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(s);
    });
    return map;
  }, [scheduleSlots]);

  // converte os slots pro formato de evento do calendario.
  // o titulo mostra quantas vagas sobraram; a cor muda quando o
  // slot esta lotado (cinza) vs disponivel (verde).
  const calendarEvents = useMemo(() => scheduleSlots.map((slot) => {
    const booked = slot._count?.appointments ?? 0;
    const available = Math.max(slot.maxCapacity - booked, 0);
    const isFull = available === 0;
    return {
      id: String(slot.id),
      title: `${slot.timeSlot} · ${isFull ? 'Esgotado' : `${available} vagas`}`,
      date: slot.date.slice(0, 10),
      backgroundColor: isFull ? '#64748b' : '#16a34a',
      borderColor: isFull ? '#475569' : '#15803d',
      extendedProps: { slot },
    };
  }), [scheduleSlots]);

  // clique num evento do calendario. se o operador pode editar,
  // abre o modal ja em modo edit.
  const handleCalendarEventClick = (info: EventClickArg) => {
    const slot = info.event.extendedProps.slot as ScheduleSlot | undefined;
    if (slot && canUpdate) {
      handleOpenEdit(slot);
    }
  };

  // abre o modal em modo criar. se veio uma data (do clique no dia),
  // usa ela; senao, sugere hoje. se quem esta criando e farmaceutico,
  // ja se sugere como responsavel.
  const handleOpenCreate = (date?: string) => {
    setEditSlot(null);
    let initialDate = todayKeyLocal();
    if (date) {
      initialDate = date;
    }
    let responsibleId = 0;
    if (user) {
      if (user.role === 'FARMACEUTICO') {
        responsibleId = user.id;
      }
    }
    setForm({
      date: initialDate,
      timeSlot: '09:00',
      maxCapacity: 4,
      assignedToId: responsibleId,
    });
    setModalOpen(true);
  };

  // abre o modal em modo editar, preenchendo com os dados do slot.
  const handleOpenEdit = (slot: ScheduleSlot) => {
    setEditSlot(slot);
    let responsibleId = 0;
    if (slot.assignedToId) {
      responsibleId = slot.assignedToId;
    }
    setForm({
      date: slot.date.split('T')[0],
      timeSlot: slot.timeSlot,
      maxCapacity: slot.maxCapacity,
      assignedToId: responsibleId,
    });
    setModalOpen(true);
  };

  // submit do modal. em edicao, data/horario ficam travados; em
  // criacao, manda todos os campos obrigatorios.
  const handleSave = async () => {
    if (!form.date) return;
    if (!form.timeSlot) return;
    setSaving(true);
    try {
      if (editSlot) {
        await api.updateScheduleSlot(editSlot.id, {
          maxCapacity: Number(form.maxCapacity),
          assignedToId: form.assignedToId > 0 ? form.assignedToId : null,
        });
        toast.success('Horário atualizado com sucesso.');
      } else {
        // chamamos o cliente http (/lib/api) pra criar um novo slot.
        await api.createScheduleSlot({
          date: form.date,
          timeSlot: form.timeSlot,
          maxCapacity: Number(form.maxCapacity),
          assignedToId: form.assignedToId,
        });
        toast.success('Horário cadastrado na escala.');
      }
      setModalOpen(false);
      fetchScheduleSlotsData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar horário.');
    } finally {
      setSaving(false);
    }
  };

  // exclui um slot. o backend rejeita se houver agendamento ativo
  // vinculado (a trava real fica no service). aqui so chamamos a api.
  const handleDelete = async (slot: ScheduleSlot) => {
    try {
      await api.deleteScheduleSlot(slot.id);
      toast.success('Horário removido da escala.');
      fetchScheduleSlotsData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir horário.');
    }
  };

  return (
    <div className="space-y-5 page-enter">
      {/* cabecalho com botao de novo horario (so pra quem pode criar) */}
      <PageHeader
        title="Escala de Horários de Atendimento"
        description="Configure os horários disponíveis e o limite de vagas para agendamento de dispensação."
        icon={CalendarDays}
        actions={
          <div className="flex items-center gap-2">
            {(() => {
              if (canCreate) {
                return (
                  <Button
                    onClick={() => handleOpenCreate()}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Novo Horário</span>
                  </Button>
                );
              }
              return null;
            })()}
          </div>
        }
      />

      {/* legenda de cores do calendario */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs dark:border-slate-700 dark:bg-slate-800" aria-label="Legenda de vagas">
        <span className="font-semibold text-slate-600 dark:text-slate-300">Legenda:</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-600" />Disponível</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-500" />Esgotado</span>
      </div>

      {/* calendario com os slots do mes. clicar num dia (se puder
          editar) abre o modal de criacao com a data pre-preenchida. */}
      <Card className="rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-5">
        <StandardCalendar
          events={calendarEvents}
          onEventClick={handleCalendarEventClick}
          onDateClick={(info) => canCreate && handleOpenCreate(info.dateStr)}
          onDatesSet={handleDatesSet}
        />
      </Card>

      {/* detalhamento em grade dos slots do mes, agrupado por dia.
          cada celula mostra vagas livres/total e permite editar ou
          excluir (o excluir fica desabilitado se houver agendamento). */}
      {(() => {
        if (Object.keys(slotsByDate).length > 0) {
          return (
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
                        {/* formatacao do dia da semana, dia e mes */}
                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                          {new Date(dateKey + 'T12:00:00').toLocaleDateString('pt-BR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          })}
                        </span>
                        <Badge variant="outline" className="text-[10px] bg-white dark:bg-slate-700">
                          {slots.length} horário{(() => {
                            if (slots.length > 1) {
                              return 's';
                            }
                            return '';
                          })()}
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
                              {/* botoes de editar/excluir, so pra quem
                                  pode escrever. o excluir fica
                                  bloqueado se houver agendamento. */}
                              {(() => {
                                if (canUpdate || canDelete) {
                                  return (
                                    <div className="flex items-center gap-1">
                                      {canUpdate && (
                                        <button
                                          onClick={() => handleOpenEdit(slot)}
                                          className="text-slate-400 hover:text-emerald-600 p-0.5"
                                          title="Editar vaga"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                        </button>
                                      )}
                                      {canDelete && (
                                        <button
                                          onClick={() => handleDelete(slot)}
                                          disabled={(slot._count?.appointments ?? 0) > 0}
                                          className="text-slate-400 hover:text-rose-600 p-0.5"
                                          title={(slot._count?.appointments ?? 0) > 0 ? 'Possui agendamentos vinculados' : 'Excluir horário'}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                            {/* contagem de vagas e badge livre/lotado */}
                            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                              <span>
                                {(() => {
                                  let count = 0;
                                  if (slot._count) {
                                    if (slot._count.appointments) {
                                      count = slot._count.appointments;
                                    }
                                  }
                                  return count;
                                })()}/{slot.maxCapacity} vagas
                              </span>
                              {(() => {
                                let count = 0;
                                if (slot._count) {
                                  if (slot._count.appointments) {
                                    count = slot._count.appointments;
                                  }
                                }
                                if (count >= slot.maxCapacity) {
                                  return <span className="text-[9px] font-bold text-amber-600">Lotado</span>;
                                }
                                return <span className="text-[9px] font-bold text-emerald-600">Livre</span>;
                              })()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          );
        }
        return null;
      })()}

      {/* modal de criar/editar. em edicao, data e horario ficam
          travados pra nao quebrar agendamentos; so capacidade e
          responsavel mudam. */}
      {(() => {
        if (canCreate || canUpdate) {
          return (
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
              <DialogContent className="sm:max-w-md rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-emerald-600" />
                    {(() => {
                      if (editSlot) {
                        return 'Editar Horário';
                      }
                      return 'Novo Horário na Escala';
                    })()}
                  </DialogTitle>
                  <DialogDescription>
                    {(() => {
                      if (editSlot) {
                        return `Alterando capacidade do horário ${editSlot.timeSlot}`;
                      }
                      return 'Selecione a data, horário e capacidade máxima de atendimentos.';
                    })()}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-1">
                  {/* select de farmaceutico responsavel. em edicao,
                      fica desabilitado porque o endpoint de update
                      nao aceita troca de responsavel por aqui. */}
                  <div>
                    <Label className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md">
                      Farmacêutico responsável
                    </Label>
                    <Select
                      value={form.assignedToId ? String(form.assignedToId) : (editSlot ? 'none' : '')}
                      onValueChange={(value) => setForm({ ...form, assignedToId: value === 'none' ? 0 : Number(value) })}
                    >
                      <SelectTrigger className="rounded-xl bg-slate-50 dark:bg-slate-700/50">
                        <SelectValue placeholder="Selecione um farmacêutico" />
                      </SelectTrigger>
                      <SelectContent>
                        {editSlot && <SelectItem value="none">Sem responsável</SelectItem>}
                        {pharmacists.map((pharmacist) => <SelectItem key={pharmacist.id} value={String(pharmacist.id)}>{pharmacist.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* data (travada em edicao) */}
                  <div>
                    <Label className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md">
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
                  {!editSlot && (
                    <div>
                      <Label className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md">
                        Horário
                      </Label>
                      <select
                        value={form.timeSlot}
                        onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 text-sm focus:outline-none"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {/* capacidade maxima (1 a 20). pode ser editada nos
                      dois modos. */}
                  <div>
                    <Label className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md">
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
                     
                    >
                      {(() => {
                        if (saving) {
                          return <Loader2 className="w-4 h-4 animate-spin" />;
                        }
                        if (editSlot) {
                          return 'Salvar Alterações';
                        }
                        return 'Criar Horário';
                      })()}
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          );
        }
        return null;
      })()}
    </div>
  );
}