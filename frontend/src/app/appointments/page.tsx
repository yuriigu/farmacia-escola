'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from '@/lib/toast-handler';
import {
  Calendar, Plus, Clock, Pill, Search, X, Check, XCircle,
  Eye, RefreshCw, CalendarDays, Download, CircleCheck
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import {
  useAppointments,
  useCancelAppointment,
  useUpdateAppointmentStatus,
} from '@/services/queries';
import { useAuthStore } from '@/lib/auth-store';
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_STYLES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { FieldError } from '@/components/ui/field-error';
import { PageHeader } from '@/components/shared/page-header';
import { AppointmentCreateModal } from '@/components/shared/appointment-create-modal';
import { DataTable } from '@/components/shared/data-table';
import type { Column } from '@/types';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { downloadCSV } from '@/lib/constants';
import { formatDateKeyBr, todayKeyLocal, toDateKey } from '@/lib/dates';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import type { Appointment, AppointmentItem } from '@/types';

// tela de agendamentos (consultas). e a tela mais complexa do sistema:
// lista consultas com filtros, cria agendamento, mostra detalhes,
// permite cancelar, confirmar e concluir (que dispara a dispensacao
// via fefo no backend).
// a mesma tela serve pra paciente e pra equipe, so que com regras
// diferentes de visualizacao e acao. por isso tem bastante checagem
// de papel (ispatient / isstaff) e de propriedade do agendamento.
function AppointmentsContent() {
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => {
    return s.user;
  });

  // determina se o usuario logado e paciente. usado pra mudar textos,
  // esconder filtros administrativos e restringir acoes.
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

  // determina se o usuario e da equipe (admin, farmaceutico ou aluno).
  // quem tem isstaff pode confirmar, concluir, exportar csv e criar
  // agendamento pra qualquer paciente.
  let isStaff = false;
  if (user) {
    if (user.role === 'ADMIN') {
      isStaff = true;
    } else if (user.role === 'FARMACEUTICO') {
      isStaff = true;
    } else if (user.role === 'ALUNO') {
      isStaff = true;
    } else {
      isStaff = false;
    }
  } else {
    isStaff = false;
  }

  // hooks de dados da listagem e das ações disponíveis nesta tela.
  const { data: appointments = [], isLoading, refetch } = useAppointments();

  // mutations expostas por /services/queries.
  // cancel e update-status sao as duas acoes principais da tela.
  const cancelAppointmentMutation = useCancelAppointment();
  const updateStatusMutation = useUpdateAppointmentStatus();

  // estados de ui da tela. alguns sao de filtro, outros de modais.
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [appointmentToCancel, setAppointmentToCancel] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonError, setCancelReasonError] = useState('');
  const [selectedAppointmentForDetails, setSelectedAppointmentForDetails] = useState<Appointment | null>(null);
  const [receipt, setReceipt] = useState<any>(null);

  // estado do modal de criacao. dois parametros de query podem abrir
  // ele direto: ?new=1 (botao generico) ou ?medicineid=n (vindo da tela
  // de medicamentos, pra ja vir com o medicamento preenchido).
  const newParam = searchParams.get('new');
  const medIdParam = searchParams.get('medicineId');

  let initialNew = false;
  if (newParam === '1') {
    initialNew = true;
  } else if (medIdParam) {
    initialNew = true;
  } else {
    initialNew = false;
  }

  let initialMedId: number | undefined = undefined;
  if (medIdParam) {
    initialMedId = Number(medIdParam);
  } else {
    initialMedId = undefined;
  }

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(initialNew);
  const handleOpenCreateModal = () => setIsCreateDialogOpen(true);

  // filtro da listagem. status + texto livre, onde texto livre cobre
  // nome, cpf do paciente, nome de medicamento e observacoes.
  const filteredAppointments = useMemo(() => {
    return appointments.filter((app) => {
      // status: all aceita tudo, senao compara direto.
      let matchesStatus = false;
      if (statusFilter === 'ALL') {
        matchesStatus = true;
      } else if (app.status === statusFilter) {
        matchesStatus = true;
      } else {
        matchesStatus = false;
      }

      // busca por texto. roda em cascata: paciente -> items -> notes.
      const term = searchTerm.toLowerCase();
      let matchesSearch = false;
      if (app.patient) {
        if (app.patient.name) {
          if (app.patient.name.toLowerCase().includes(term)) {
            matchesSearch = true;
          }
        }
        if (app.patient.cpf) {
          if (app.patient.cpf.includes(searchTerm)) {
            matchesSearch = true;
          }
        }
      }
      if (!matchesSearch && app.items) {
        for (let i = 0; i < app.items.length; i++) {
          const item = app.items[i];
          if (item.medicine) {
            if (item.medicine.name) {
              if (item.medicine.name.toLowerCase().includes(term)) {
                matchesSearch = true;
                break;
              }
            }
          }
        }
      }
      if (!matchesSearch && app.notes) {
        if (app.notes.toLowerCase().includes(term)) {
          matchesSearch = true;
        }
      }

      if (matchesStatus && matchesSearch) {
        return true;
      }
      return false;
    });
  }, [appointments, statusFilter, searchTerm]);

  // confirma o cancelamento. exige motivo e chama a mutation de
  // cancelamento (/services/queries -> /api/appointments/:id/status
  // com canceled + justificativa).
  const handleConfirmCancel = () => {
    if (!cancelReason.trim()) {
      setCancelReasonError('O motivo do cancelamento é obrigatório.');
      document.getElementById('appointment-cancel-reason')?.focus();
      return;
    }
    setCancelReasonError('');
    if (appointmentToCancel) {
      cancelAppointmentMutation.mutate({ id: appointmentToCancel, reason: cancelReason.trim() }, {
        onSuccess: () => {
          toast.success('Agendamento cancelado.');
          setAppointmentToCancel(null);
          setCancelReason('');
        },
        onError: (err: any) => {
          let msg = 'Erro ao cancelar agendamento.';
          if (err) {
            if (err.message) {
              msg = err.message;
            } else {
              msg = 'Erro ao cancelar agendamento.';
            }
          } else {
            msg = 'Erro ao cancelar agendamento.';
          }
          toast.error(msg);
        },
      });
    }
  };

  // definicao das colunas da tabela. cada coluna resolve o dado
  // certo do agendamento (data, paciente, medicamento, status, acoes).
  const columns: Column<Appointment>[] = [
    {
      header: 'Data & Horário',
      width: '180px',
      cell: (app) => {
        const scheduled = new Date(app.scheduledDate);
        const dateStr = formatDateKeyBr(toDateKey(app.scheduledDate));

        let timeStr = '';
        if (app.scheduledTime) {
          timeStr = app.scheduledTime;
        } else if (!Number.isNaN(scheduled.getTime())) {
          timeStr = scheduled.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } else {
          timeStr = '';
        }

        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-tight">
                {dateStr}
              </p>
              {timeStr && (
                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {timeStr}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Paciente',
      width: '200px',
      cell: (app) => {
        // nome do paciente com fallback pro usuario logado quando
        // for paciente e o agendamento nao trouxe o objeto patient.
        let name = 'Não informado';
        if (app.patient) {
          if (app.patient.name) {
            name = app.patient.name;
          } else if (isPatient) {
            if (user) {
              if (user.name) {
                name = user.name;
              }
            }
          }
        } else if (isPatient) {
          if (user) {
            if (user.name) {
              name = user.name;
            }
          }
        }

        let cpf: string | undefined = undefined;
        if (app.patient) {
          if (app.patient.cpf) {
            cpf = app.patient.cpf;
          }
        }

        return (
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm line-clamp-1">
              {name}
            </p>
            {cpf && <p className="text-[11px] text-slate-400 font-mono mt-0.5">{cpf}</p>}
          </div>
        );
      },
    },
    {
      header: 'Medicamento(s)',
      cell: (app) => {
        // mostra o primeiro medicamento e, se houver mais de um,
        // exibe um badge com a contagem dos demais.
        let firstItem: AppointmentItem | undefined = undefined;
        if (app.items) {
          if (app.items.length > 0) {
            firstItem = app.items[0];
          }
        }

        let medName = 'Medicamento não especificado';
        let dosage: string | undefined = undefined;
        let qty = 1;
        if (firstItem) {
          if (firstItem.medicine) {
            if (firstItem.medicine.name) {
              medName = firstItem.medicine.name;
            }
            if (firstItem.medicine.dosage) {
              dosage = firstItem.medicine.dosage;
            }
          }
          if (firstItem.quantity) {
            qty = firstItem.quantity;
          }
        }

        let totalItems = 0;
        if (app.items) {
          totalItems = app.items.length;
        }

        let dosageElement: React.ReactNode = null;
        if (dosage) {
          dosageElement = <span className="text-slate-400 text-xs">({dosage})</span>;
        }

        let extraItemsBadge: React.ReactNode = null;
        if (totalItems > 1) {
          extraItemsBadge = (
            <span className="ml-1.5 text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
              +{totalItems - 1} outro(s)
            </span>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
              <Pill className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                {medName} {dosageElement}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Quantidade: <span className="font-semibold text-slate-700 dark:text-slate-300">{qty} un.</span>
                {extraItemsBadge}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Status',
      width: '130px',
      cell: (app) => {
        // badge colorido de acordo com o status. a cor vem do map
        // de estilos, e o label vem do map de labels (ambos em constants).
        let statusStyle = APPOINTMENT_STATUS_STYLES.PENDING;
        if (APPOINTMENT_STATUS_STYLES[app.status]) {
          statusStyle = APPOINTMENT_STATUS_STYLES[app.status];
        }

        let statusLabel: string = app.status;
        if (APPOINTMENT_STATUS_LABELS[app.status]) {
          statusLabel = APPOINTMENT_STATUS_LABELS[app.status];
        }

        return (
          <Badge
            variant="outline"
            className={'font-semibold text-[11px] ' + statusStyle}
          >
            {statusLabel}
          </Badge>
        );
      },
    },
    {
      header: 'Ações',
      align: 'right',
      width: '150px',
      cell: (app) => {
        // validacao estrita de idor + rbac:
        // paciente so pode cancelar agendamentos que pertencem ao
        // proprio perfil. a checagem bate o patientid direto e tambem
        // o patient.id (compatibilidade com formatos diferentes da api).
        let isOwner = true;
        if (isPatient) {
          if (user) {
            if (app.patientId === user.patientId) {
              isOwner = true;
            } else if (user.patientId) {
              if (app.patient) {
                if (app.patient.id === user.patientId) {
                  isOwner = true;
                } else {
                  isOwner = false;
                }
              } else {
                isOwner = false;
              }
            } else {
              isOwner = false;
            }
          } else {
            isOwner = false;
          }
        } else {
          isOwner = true;
        }

        // canact e a permissao efetiva: staff age em tudo, paciente
        // so nos proprios. depois disso, o status tambem filtra:
        // so pending e confirmed podem ser cancelados.
        let canCancel = false;
        let userCanAct = false;
        if (isStaff) {
          userCanAct = true;
        } else if (isPatient) {
          if (isOwner) {
            userCanAct = true;
          }
        }

        if (userCanAct) {
          if (app.status === 'PENDING') {
            canCancel = true;
          } else if (app.status === 'CONFIRMED') {
            canCancel = true;
          }
        }

        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedAppointmentForDetails(app)}
              className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
              title="Visualizar detalhes"
            >
              <Eye className="w-4 h-4" />
            </Button>

            {/* acoes exclusivas da equipe: confirmar e concluir */}
            {(() => {
              if (isStaff) {
                if (app.status === 'PENDING') {
                  return (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateStatusMutation.mutate({ id: app.id, status: 'CONFIRMED' })}
                      disabled={updateStatusMutation.isPending}
                      className="h-8 w-8 p-0 rounded-lg text-emerald-500 hover:text-emerald-400 dark:text-emerald-500 dark:hover:text-emerald-400"
                      title="Confirmar Agendamento — Valida o agendamento e reserva a vaga (status CONFIRMADO)"
                      aria-label="Confirmar Agendamento"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  );
                }
              }
              return null;
            })()}

            {(() => {
              if (isStaff) {
                // concluir e a acao final: efetiva o atendimento e
                // realiza a dispensacao. so fica disponivel enquanto
                // o agendamento ainda esta em andamento.
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
                      onClick={() => updateStatusMutation.mutate({ id: app.id, status: 'COMPLETED' }, {
                        onSuccess: (withdrawal) => {
                          // a resposta da dispensacao vira o comprovante
                          // exibido no modal de retirada.
                          setReceipt(withdrawal);
                          refetch();
                        },
                      })}
                      disabled={updateStatusMutation.isPending}
                      className="h-8 w-8 p-0 rounded-lg text-emerald-500 hover:text-emerald-400 dark:text-emerald-500 dark:hover:text-emerald-400"
                      title="Concluir Agendamento — Efetiva o atendimento e a dispensação (status CONCLUIDO)"
                      aria-label="Concluir Agendamento"
                    >
                      <CircleCheck className="w-4 h-4" />
                    </Button>
                  );
                }
              }
              return null;
            })()}

            {/* cancelamento: so pra dono ou equipe */}
            {canCancel && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setAppointmentToCancel(app.id); setCancelReason(''); }}
                disabled={cancelAppointmentMutation.isPending}
                className="h-8 w-8 p-0 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                title="Cancelar Agendamento"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  // exporta em csv os agendamentos filtrados. so a equipe ve o botao.
  const handleExportCSV = () => {
    const header = ['Paciente', 'CPF', 'Data Agendada', 'Horário', 'Status', 'Medicamento(s)', 'Observações'];
    const rows = filteredAppointments.map((app) => {
      let patientName = app.patient?.name ?? (isPatient && user?.name ? user.name : 'Não informado');
      let patientCpf = app.patient?.cpf ?? (isPatient ? '—' : '');
      const dateLabel = formatDateKeyBr(toDateKey(app.scheduledDate));
      const timeLabel = app.scheduledTime ?? '—';
      const statusLabel = APPOINTMENT_STATUS_LABELS[app.status] ?? app.status;
      const medNames = app.items?.map((item) => item.medicine?.name ?? 'Sem nome').join('; ') ?? 'Nenhum';
      const notes = app.notes ?? '';
      return [patientName, patientCpf, dateLabel, timeLabel, statusLabel, medNames, notes];
    });
    downloadCSV('agendamentos_' + todayKeyLocal() + '.csv', [header, ...rows]);
    toast.success('Agendamentos exportados com sucesso!');
  };

  // textos mudam conforme o papel: paciente ve uma descricao mais
  // pessoal, equipe ve a descricao de gestao.
  let pageDesc = 'Gerenciamento completo das solicitações e atendimentos da Farmácia Escola.';
  if (isPatient) {
    pageDesc = 'Acompanhe o status e as datas das suas consultas e retiradas agendadas.';
  } else {
    pageDesc = 'Gerenciamento completo das solicitações e atendimentos da Farmácia Escola.';
  }

  return (
    <AppShell activeModuleId="appointments" pageTitle="Agendamentos de Retirada">
      <div className="space-y-5 max-w-7xl mx-auto page-enter">
        {/* cabecalho da pagina com acoes (exportar, atualizar, novo) */}
        <PageHeader
          title="Agendamentos de Retirada"
          description={pageDesc}
          icon={Calendar}
          actions={
            <div className="flex items-center gap-2">
              {/* exportar csv so pra equipe */}
              {(() => {
                if (!isPatient) {
                  return (
                    <Button
                      variant="outline"
                      onClick={handleExportCSV}
                      disabled={filteredAppointments.length === 0}
                      className="h-10 rounded-xl gap-2 text-sm font-medium border-slate-200 dark:border-slate-700"
                    >
                      <Download className="w-4 h-4" />
                      <span>Exportar CSV</span>
                    </Button>
                  );
                }
                return null;
              })()}
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="h-10 rounded-xl gap-2 text-sm font-medium border-slate-200 dark:border-slate-700"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Atualizar</span>
              </Button>

              <Button
                onClick={handleOpenCreateModal}
              >
                <Plus className="w-4 h-4" />
                <span>Novo Agendamento</span>
              </Button>
            </div>
          }
        />

        {/* filtros compactos: busca por texto + chips de status */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Buscar por paciente, CPF ou medicamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
            />
            {/* botao de limpar busca, aparece so quando tem texto */}
            {(() => {
              if (searchTerm.length > 0) {
                return (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                );
              }
              return null;
            })()}
          </div>

          {/* chips de filtro de status, com rolagem horizontal em telas pequenas */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto no-scrollbar">
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'PENDING', label: 'Pendentes' },
              { id: 'CONFIRMED', label: 'Confirmados' },
              { id: 'COMPLETED', label: 'Concluídos' },
              { id: 'CANCELLED', label: 'Cancelados' },
            ].map((tab) => {
              let chipClass = 'px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ';
              if (statusFilter === tab.id) {
                chipClass = chipClass + 'bg-emerald-600 text-white shadow-sm';
              } else {
                chipClass = chipClass + 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600';
              }
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={chipClass}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* tabela de agendamentos, com empty state e clique na linha */}
        <DataTable
          columns={columns}
          data={filteredAppointments}
          isLoading={isLoading}
          emptyIcon={CalendarDays}
          emptyTitle="Nenhum agendamento encontrado"
          emptyDescription="Não há agendamentos correspondentes aos critérios da busca."
          emptyAction={
            <Button
              onClick={handleOpenCreateModal}
              size="sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Criar Agendamento
            </Button>
          }
          onRowClick={(app) => setSelectedAppointmentForDetails(app)}
        />

        <AppointmentCreateModal
          key={isCreateDialogOpen ? `open-${initialMedId ?? 'new'}` : 'closed'}
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          initialMedicineId={initialMedId}
          onSuccess={() => refetch()}
        />

        {/* modal de detalhes do agendamento, com acoes de status pra equipe */}
        <Dialog
          open={selectedAppointmentForDetails !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedAppointmentForDetails(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-125 rounded-3xl">
            {(() => {
              if (!selectedAppointmentForDetails) {
                return null;
              }
              const app = selectedAppointmentForDetails;
              const dateStr = formatDateKeyBr(toDateKey(app.scheduledDate));

              let statusStyle = APPOINTMENT_STATUS_STYLES.PENDING;
              if (APPOINTMENT_STATUS_STYLES[app.status]) {
                statusStyle = APPOINTMENT_STATUS_STYLES[app.status];
              }

              let statusLabel: string = app.status;
              if (APPOINTMENT_STATUS_LABELS[app.status]) {
                statusLabel = APPOINTMENT_STATUS_LABELS[app.status];
              }

              let patientName = 'Não informado';
              if (app.patient) {
                if (app.patient.name) {
                  patientName = app.patient.name;
                } else if (isPatient) {
                  if (user) {
                    if (user.name) {
                      patientName = user.name;
                    }
                  }
                }
              } else if (isPatient) {
                if (user) {
                  if (user.name) {
                    patientName = user.name;
                  }
                }
              }

              let patientCpfElement: React.ReactNode = null;
              if (app.patient) {
                if (app.patient.cpf) {
                  patientCpfElement = (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">CPF:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {app.patient.cpf}
                      </span>
                    </div>
                  );
                }
              }

              let timeString = '';
              if (app.scheduledTime) {
                timeString = ' às ' + app.scheduledTime;
              }

              return (
                <div className="space-y-4">
                  <DialogHeader>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className={'font-semibold text-[11px] ' + statusStyle}
                      >
                        {statusLabel}
                      </Badge>
                      <span className="text-xs text-slate-400 font-mono">
                        #{app.id}
                      </span>
                    </div>
                    <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-teal-600" />
                      Detalhes do Agendamento
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-3 py-2">
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Paciente:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {patientName}
                        </span>
                      </div>
                      {patientCpfElement}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Data Agendada:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {dateStr}{timeString}
                        </span>
                      </div>
                    </div>

                    {/* lista de medicamentos solicitados no agendamento */}
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        Medicamento(s) Solicitados
                      </h4>
                      {(() => {
                        if (app.items && app.items.length > 0) {
                          return app.items.map((item, idx) => {
                            let itemName = '';
                            if (item.medicine) {
                              if (item.medicine.name) {
                                itemName = item.medicine.name;
                              }
                            }
                            let itemDosage: React.ReactNode = null;
                            if (item.medicine) {
                              if (item.medicine.dosage) {
                                itemDosage = <span className="text-slate-400">({item.medicine.dosage})</span>;
                              }
                            }
                            return (
                              <div
                                key={idx}
                                className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-800 flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <Pill className="w-4 h-4 text-emerald-600" />
                                  <span className="font-bold text-slate-800 dark:text-slate-200">
                                    {itemName}
                                  </span>
                                  {itemDosage}
                                </div>
                                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                  {item.quantity} un.
                                </span>
                              </div>
                            );
                          });
                        }
                        return <p className="text-xs text-slate-400">Nenhum item listado.</p>;
                      })()}
                    </div>

                    {/* observacoes do agendamento, se existirem */}
                    {(() => {
                      if (app.notes) {
                        return (
                          <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl text-xs text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                            <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Observações:</span>
                            {app.notes}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  <DialogFooter className="pt-2 flex items-center justify-between sm:justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedAppointmentForDetails(null)}
                      className="rounded-xl text-xs"
                    >
                      Fechar
                    </Button>
                    {/* acoes de status pra equipe dentro do modal de detalhes */}
                    {(() => {
                      if (isStaff) {
                        // pending -> confirmed (validacao) e pending/confirmed -> completed (dispensacao)
                        let canConfirm = false;
                        let canComplete = false;
                        if (app.status === 'PENDING') {
                          canConfirm = true;
                          canComplete = true;
                        } else if (app.status === 'CONFIRMED') {
                          canComplete = true;
                        }

                        return (
                          <div className="flex items-center gap-2">
                            {canConfirm && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  updateStatusMutation.mutate({ id: app.id, status: 'CONFIRMED' }, {
                                    onSuccess: () => {
                                      refetch();
                                      setSelectedAppointmentForDetails(null);
                                    },
                                  });
                                }}
                                disabled={updateStatusMutation.isPending}
                                className="rounded-xl border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-xs font-semibold gap-1.5"
                                title="Confirmar Agendamento — Valida o agendamento e reserva a vaga (status CONFIRMADO)"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Confirmar Agendamento
                              </Button>
                            )}
                            {canComplete && (
                              <Button
                                type="button"
                                onClick={() => {
                                  updateStatusMutation.mutate({ id: app.id, status: 'COMPLETED' }, {
                                    onSuccess: (withdrawal) => {
                                      // guarda o comprovante de retirada pra exibir no modal
                                      setReceipt(withdrawal);
                                      setSelectedAppointmentForDetails(null);
                                      refetch();
                                    },
                                  });
                                }}
                                disabled={updateStatusMutation.isPending}
                                className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold gap-1.5"
                                title="Concluir Agendamento — Efetiva o atendimento e a dispensação (status CONCLUIDO)"
                              >
                                <CircleCheck className="w-3.5 h-3.5" />
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
            })()}
          </DialogContent>
        </Dialog>

        {/* modal de confirmacao de cancelamento, com textarea obrigatorio do motivo */}
        <AlertDialog open={appointmentToCancel !== null} onOpenChange={() => setAppointmentToCancel(null)}>
          <AlertDialogContent className="rounded-2xl max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                <XCircle className="w-5 h-5" />
                Cancelar Agendamento
              </AlertDialogTitle>
              <AlertDialogDescription>
                  Informe obrigatoriamente o motivo do cancelamento. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
              <Textarea
                id="appointment-cancel-reason"
                aria-label="Motivo do cancelamento"
                value={cancelReason}
                aria-invalid={!!cancelReasonError}
                aria-describedby={cancelReasonError ? 'appointment-cancel-reason-error' : undefined}
                onChange={(event) => {
                  setCancelReason(event.target.value);
                  setCancelReasonError('');
                }}
                placeholder="Motivo do Cancelamento"
                rows={4}
              />
              {cancelReasonError && <FieldError id="appointment-cancel-reason-error" message={cancelReasonError} />}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Não, manter</AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  if (!cancelReason.trim()) {
                    event.preventDefault();
                    setCancelReasonError('O motivo do cancelamento é obrigatório.');
                    document.getElementById('appointment-cancel-reason')?.focus();
                    return;
                  }
                  handleConfirmCancel();
                }}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
              >
                Sim, cancelar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* modal de comprovante de retirada, exibido apos conclusao com fefo */}
        <Dialog open={receipt !== null} onOpenChange={(open) => { if (!open) setReceipt(null); }}>
          <DialogContent className="rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle>Comprovante de Retirada</DialogTitle>
              <DialogDescription>Baixa FEFO concluída para este atendimento.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <p><span className="text-slate-500">Paciente:</span> {receipt?.patient?.name ?? 'Não informado'}</p>
              <p><span className="text-slate-500">Lote consumido:</span> {receipt?.batch?.batchNumber ?? receipt?.allocatedItems?.map((item: { batchNumber: string }) => item.batchNumber).join(', ') ?? 'Baixa FEFO registrada'}</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReceipt(null)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

// wrapper com suspense porque o componente usa usesearchparams, que
// exige estar dentro de um suspense boundary no next 13+.
export default function AppointmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500">
          Carregando agendamentos...
        </div>
      }
    >
      <AppointmentsContent />
    </Suspense>
  );
}