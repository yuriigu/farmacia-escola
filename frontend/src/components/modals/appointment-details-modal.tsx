'use client';

// imports do react
import type { ReactNode } from 'react';

// icones
import { Calendar, Check, CircleCheckBig, Clock, Pill, FileText } from 'lucide-react';

// stores, api e helpers
import { toast } from '@/lib/toast-handler';
import { maskCPF } from '@/lib/masks';
import { useAuthStore } from '@/lib/auth-store';
import { usePermission } from '@/hooks/use-permission';
import {
  fetchAppointmentsData,
  fetchBatchesData,
  fetchMedicinesData,
  fetchScheduleSlotsData,
} from '@/lib/pharmacy-store';
import { APPOINTMENT_STATUS_STYLES, APPOINTMENT_STATUS_LABELS, getAvatarColor } from '@/lib/constants';
import { api } from '@/lib/api';
import { formatDateKeyBr, toDateKey } from '@/lib/dates';

// componentes de ui
import type { Appointment } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

// props do modal compartilhado de detalhes do agendamento. recebe o
// agendamento selecionado (ou null quando fechado), o handler padrao de
// abrir/fechar e um callback acionado quando o atendimento e concluido
// (a pagina pai usa pra exibir o comprovante de retirada).
interface AppointmentDetailsModalProps {
  appointment: Appointment | null;
  onOpenChange: (open: boolean) => void;
  onComplete?: (withdrawal: unknown) => void;
}

// modal de detalhes do agendamento. unico ponto de visualizacao usado
// tanto no modulo /appointments quanto na aba /calendar (olhinho).
// mostra status, paciente (com avatar e cpf formatado), medicamentos
// solicitados, data/horario, observacoes e as acoes de confirmar/
// concluir pra equipe nao-medico.
export function AppointmentDetailsModal({ appointment, onOpenChange, onComplete }: AppointmentDetailsModalProps) {
  const user = useAuthStore((s) => {
    return s.user;
  });

  // determina se o usuario logado e paciente/medico. muda a disponibilidade
  // das acoes de status no rodape do modal.
  let isPatient = false;
  if (user) {
    if (user.role === 'PACIENTE') {
      isPatient = true;
    }
  }

  let isMedico = false;
  if (user) {
    if (user.role === 'MEDICO') {
      isMedico = true;
    }
  }

  // permissao granular de alteracao de status (confirmar/concluir).
  // o backend (role-middleware) concede APPOINTMENTS_UPDATE apenas a
  // ADMIN, FARMACEUTICO e ALUNO — PACIENTE e MEDICO ficam sem acesso.
  // mantemos tambem as travas explicitas de papel porque o
  // canWriteClient do frontend ainda libera 'appointments' para
  // MEDICO/PACIENTE (escrita ampla), o que nao reflete o UPDATE real.
  const canUpdateAppointment = usePermission('APPOINTMENTS_UPDATE');
  const canManageAppointmentStatus = canUpdateAppointment && !isPatient && !isMedico;

  return (
    <Dialog open={appointment !== null} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600">
              <Calendar className="w-5 h-5" />
            </div>
            Detalhes do Atendimento
          </DialogTitle>
          <DialogDescription>Informações completas do agendamento</DialogDescription>
        </DialogHeader>
        {(() => {
          if (appointment) {
            // resolve label/cor do status do detalhe.
            let detailStatusStyle = '';
            if (APPOINTMENT_STATUS_STYLES[appointment.status]) {
              detailStatusStyle = APPOINTMENT_STATUS_STYLES[appointment.status];
            }

            let detailStatusLabel: string = appointment.status;
            if (APPOINTMENT_STATUS_LABELS[appointment.status]) {
              detailStatusLabel = APPOINTMENT_STATUS_LABELS[appointment.status];
            }

            return (
              <div className="space-y-4">
                {/* badge de status */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={detailStatusStyle}>
                    {detailStatusLabel}
                  </Badge>
                </div>

                {/* bloco do paciente, com avatar e cpf formatado */}
                {(() => {
                  if (appointment.patient) {
                    let patientCpfEl: ReactNode = null;
                    if (appointment.patient.cpf) {
                      patientCpfEl = <p className="text-xs text-slate-400 font-mono">{maskCPF(appointment.patient.cpf)}</p>;
                    }
                    return (
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <div className={'w-10 h-10 rounded-full ' + getAvatarColor(appointment.patient.name) + ' text-white flex items-center justify-center font-bold'}>
                            {appointment.patient.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200">{appointment.patient.name}</p>
                            {patientCpfEl}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* bloco dos medicamentos solicitados */}
                {(() => {
                  if (appointment.items) {
                    if (appointment.items.length > 0) {
                      return (
                        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Pill className="w-3.5 h-3.5 text-emerald-500" />
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Medicamento(s)</p>
                          </div>
                          {appointment.items.map((item, idx) => {
                            let itemKey: string | number = idx;
                            if (item.id) {
                              itemKey = item.id;
                            }
                            let itemBorder = '';
                            if (idx > 0) {
                              itemBorder = 'mt-2 pt-2 border-t border-emerald-100 dark:border-emerald-800';
                            }

                            let medItemName = 'Medicamento não informado';
                            let medDosageEl: ReactNode = null;
                            let medActiveEl: ReactNode = null;
                            if (item.medicine) {
                              if (item.medicine.name) {
                                medItemName = item.medicine.name;
                              }
                              if (item.medicine.dosage) {
                                medDosageEl = <p className="text-xs text-slate-400">Dosagem: {item.medicine.dosage}</p>;
                              }
                              if (item.medicine.activeIngredient) {
                                medActiveEl = <p className="text-xs text-slate-400">Princípio Ativo: {item.medicine.activeIngredient}</p>;
                              }
                            }

                            return (
                              <div key={itemKey} className={itemBorder}>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{medItemName}</p>
                                {medDosageEl}
                                {medActiveEl}
                                <p className="text-xs text-emerald-600 font-medium">Quantidade: {item.quantity} un.</p>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                  }
                  return null;
                })()}

                {/* data e horario, com fallback pra hora do proprio date */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data Agendada</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {formatDateKeyBr(toDateKey(appointment.scheduledDate), {
                        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Horário</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {(() => {
                        if (appointment.scheduledTime) {
                          return appointment.scheduledTime;
                        }
                        const d = new Date(appointment.scheduledDate);
                        if (Number.isNaN(d.getTime())) {
                          return '—';
                        }
                        return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                      })()}
                    </p>
                  </div>
                </div>

                {/* observacoes, so se existirem */}
                {(() => {
                  if (appointment.notes) {
                    return (
                      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                        <div className="flex items-center gap-1.5 mb-2">
                          <FileText className="w-3.5 h-3.5 text-blue-500" />
                          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Observações</p>
                        </div>
                        <p className="text-sm text-blue-800 dark:text-blue-300">{appointment.notes}</p>
                      </div>
                    );
                  }
                  return null;
                })()}

                <DialogFooter className="pt-3 flex items-center justify-between sm:justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="rounded-xl text-xs"
                  >
                    Fechar
                  </Button>
                  {/* acoes de status pra equipe autorizada (APPOINTMENTS_UPDATE: ADMIN/FARMACEUTICO/ALUNO) */}
                  {(() => {
                    if (canManageAppointmentStatus) {
                        let canConfirm = false;
                        let canComplete = false;
                        if (appointment.status === 'PENDING') {
                          canConfirm = true;
                          canComplete = true;
                        } else {
                          if (appointment.status === 'CONFIRMED') {
                            canComplete = true;
                          } else {
                            canComplete = false;
                          }
                        }
                        return (
                          <div className="flex items-center gap-2">
                            {canConfirm && (
                              <Button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await api.confirmAppointment(appointment.id);
                                    toast.success('Agendamento confirmado.');
                                    onOpenChange(false);
                                    void fetchAppointmentsData();
                                    void fetchScheduleSlotsData();
                                  } catch {
                                    toast.error('Erro ao confirmar agendamento.');
                                  }
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-none rounded-xl text-xs font-semibold gap-1.5 whitespace-nowrap"
                                title="Confirmar Agendamento — Valida o agendamento e reserva a vaga (status CONFIRMADO)"
                              >
                                <Check className="w-4 h-4" />
                                Confirmar Agendamento
                              </Button>
                            )}
                            {canComplete && (
                              <Button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const withdrawal = await api.completeAppointment(appointment.id);
                                    if (onComplete) {
                                      onComplete(withdrawal);
                                    }
                                    toast.success('Agendamento concluído com sucesso!');
                                    onOpenChange(false);
                                    void fetchAppointmentsData();
                                    void fetchScheduleSlotsData();
                                    void fetchMedicinesData();
                                    void fetchBatchesData();
                                  } catch {
                                    toast.error('Erro ao concluir agendamento.');
                                  }
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-none rounded-xl text-xs font-semibold gap-1.5 whitespace-nowrap"
                                title="Concluir Agendamento — Efetiva o atendimento e a dispensação (status CONCLUIDO)"
                              >
                                <CircleCheckBig className="w-4 h-4" />
                                Concluir Agendamento
                              </Button>
                            )}
                          </div>
                        );
                    }
                    return null;
                  })()}
                </DialogFooter>
              </div>
            );
          }
          return null;
        })()}
      </DialogContent>
    </Dialog>
  );
}

