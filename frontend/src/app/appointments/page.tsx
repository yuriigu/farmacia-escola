'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Calendar, Plus, Clock, Pill, Search, X, Check, XCircle,
  Eye, RefreshCw, CalendarDays, User, FileText, HeartPulse, ShieldCheck
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import {
  useAppointments,
  useCancelAppointment,
  useUpdateAppointmentStatus,
  useCreateAppointment,
  useMedicines,
  usePatients,
} from '@/services/Queries';
import { useAuthStore } from '@/lib/AuthStore';
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_STYLES } from '@/lib/Constants';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from '@/components/ui/Dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import type { Appointment, AppointmentItem } from '@/lib/Types';

function AppointmentsContent() {
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => {
    return s.user;
  });

  // DETERMINANDO SE E PACIENTE
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

  // DETERMINANDO SE E STAFF
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

  const { data: appointments = [], isLoading, refetch } = useAppointments();
  const { data: medicines = [] } = useMedicines();
  const { data: patients = [] } = usePatients();

  const cancelAppointmentMutation = useCancelAppointment();
  const updateStatusMutation = useUpdateAppointmentStatus();
  const createAppointmentMutation = useCreateAppointment();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [appointmentToCancel, setAppointmentToCancel] = useState<number | null>(null);
  const [selectedAppointmentForDetails, setSelectedAppointmentForDetails] = useState<Appointment | null>(null);

  // Create Appointment Dialog State
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
  const [selectedMedId, setSelectedMedId] = useState<number | undefined>(initialMedId);
  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>(undefined);
  const [appointmentDate, setAppointmentDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [appointmentTime, setAppointmentTime] = useState('09:00');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  // Reset form when modal opens
  const handleOpenCreateModal = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setAppointmentDate(tomorrow.toISOString().split('T')[0]);
    setAppointmentTime('09:00');
    setQuantity(1);
    setNotes('');
    if (!isPatient && patients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(patients[0].id);
    }
    if (medicines.length > 0 && !selectedMedId) {
      setSelectedMedId(medicines[0].id);
    }
    setIsCreateDialogOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedId) {
      toast.error('Selecione um medicamento.');
      return;
    }
    if (!appointmentDate) {
      toast.error('Selecione uma data para o agendamento.');
      return;
    }
    if (!isPatient && !selectedPatientId) {
      toast.error('Selecione o paciente.');
      return;
    }

    let targetPatientId: number | undefined = undefined;
    if (!isPatient) {
      targetPatientId = selectedPatientId;
    } else {
      targetPatientId = undefined;
    }

    let notesVal: string | undefined = undefined;
    if (notes.trim().length > 0) {
      notesVal = notes.trim();
    } else {
      notesVal = undefined;
    }

    createAppointmentMutation.mutate(
      {
        scheduledDate: appointmentDate,
        scheduledTime: appointmentTime,
        patientId: targetPatientId,
        notes: notesVal,
        items: [
          {
            medicineId: selectedMedId,
            quantity: quantity,
          },
        ],
      },
      {
        onSuccess: () => {
          toast.success('Agendamento criado com sucesso!');
          setIsCreateDialogOpen(false);
          refetch();
        },
        onError: (err: any) => {
          let msg = 'Erro ao criar agendamento.';
          if (err) {
            if (err.message) {
              msg = err.message;
            } else {
              msg = 'Erro ao criar agendamento.';
            }
          } else {
            msg = 'Erro ao criar agendamento.';
          }
          toast.error(msg);
        },
      }
    );
  };

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((app) => {
      let matchesStatus = false;
      if (statusFilter === 'ALL') {
        matchesStatus = true;
      } else if (app.status === statusFilter) {
        matchesStatus = true;
      } else {
        matchesStatus = false;
      }

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

  const handleConfirmCancel = () => {
    if (appointmentToCancel) {
      cancelAppointmentMutation.mutate(appointmentToCancel, {
        onSuccess: () => {
          toast.success('Agendamento cancelado.');
          setAppointmentToCancel(null);
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

  const columns: Column<Appointment>[] = [
    {
      header: 'Data & Horário',
      width: '180px',
      cell: (app) => {
        const scheduled = new Date(app.scheduledDate);
        let dateStr = '—';
        if (Number.isNaN(scheduled.getTime())) {
          dateStr = '—';
        } else {
          dateStr = scheduled.toLocaleDateString('pt-BR');
        }

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
        // Strict IDOR & RBAC validation:
        // A patient can only cancel appointments that belong to their own patient profile.
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

            {/* Staff status updates */}
            {isStaff && app.status === 'PENDING' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => updateStatusMutation.mutate({ id: app.id, status: 'CONFIRMED' })}
                disabled={updateStatusMutation.isPending}
                className="h-8 w-8 p-0 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                title="Confirmar Agendamento"
              >
                <Check className="w-4 h-4" />
              </Button>
            )}

            {isStaff && app.status === 'CONFIRMED' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => updateStatusMutation.mutate({ id: app.id, status: 'COMPLETED' })}
                disabled={updateStatusMutation.isPending}
                className="h-8 w-8 p-0 rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30"
                title="Concluir Atendimento"
              >
                <Check className="w-4 h-4" />
              </Button>
            )}

            {/* Cancel action (strictly isolated to owner or staff) */}
            {canCancel && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAppointmentToCancel(app.id)}
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

  let pageDesc = 'Gerenciamento completo das solicitações e atendimentos da Farmácia Escola.';
  if (isPatient) {
    pageDesc = 'Acompanhe o status e as datas das suas consultas e retiradas agendadas.';
  } else {
    pageDesc = 'Gerenciamento completo das solicitações e atendimentos da Farmácia Escola.';
  }

  let createModalDesc = 'Registre um novo agendamento de atendimento farmacêutico.';
  if (isPatient) {
    createModalDesc = 'Agende a data e o horário para retirar seu medicamento gratuito.';
  } else {
    createModalDesc = 'Registre um novo agendamento de atendimento farmacêutico.';
  }

  let selectedPatientVal = '';
  if (selectedPatientId) {
    selectedPatientVal = String(selectedPatientId);
  } else {
    selectedPatientVal = '';
  }

  let selectedMedVal = '';
  if (selectedMedId) {
    selectedMedVal = String(selectedMedId);
  } else {
    selectedMedVal = '';
  }

  return (
    <AppShell activeModuleId={'appointments' as any} pageTitle="Agendamentos de Retirada">
      <div className="space-y-5 max-w-7xl mx-auto page-enter">
        {/* Standard PageHeader */}
        <PageHeader
          title="Agendamentos de Retirada"
          description={pageDesc}
          icon={Calendar}
          actions={
            <div className="flex items-center gap-2">
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
                className="h-10 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm active:scale-[0.98] transition-transform"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Agendamento</span>
              </Button>
            </div>
          }
        />

        {/* Compact Filters */}
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

          {/* Status Filter Chips */}
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

        {/* Standard DataTable */}
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
              className="h-9 rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Criar Agendamento
            </Button>
          }
          onRowClick={(app) => setSelectedAppointmentForDetails(app)}
        />

        {/* ==================== CREATE APPOINTMENT MODAL ==================== */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Novo Agendamento
              </DialogTitle>
              <DialogDescription>
                {createModalDesc}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
              {/* Patient Selector for Staff */}
              {(() => {
                if (!isPatient) {
                  return (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-emerald-600" />
                        Paciente *
                      </Label>
                      <Select
                        value={selectedPatientVal}
                        onValueChange={(v) => setSelectedPatientId(Number(v))}
                      >
                        <SelectTrigger className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs">
                          <SelectValue placeholder="Selecione o paciente..." />
                        </SelectTrigger>
                        <SelectContent>
                          {patients.map((p) => {
                            let cpfStr = '';
                            if (p.cpf) {
                              cpfStr = ' (CPF: ' + p.cpf + ')';
                            }
                            return (
                              <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                                {p.name}{cpfStr}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Medicine Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <Pill className="w-3.5 h-3.5 text-emerald-600" />
                  Medicamento *
                </Label>
                <Select
                  value={selectedMedVal}
                  onValueChange={(v) => setSelectedMedId(Number(v))}
                >
                  <SelectTrigger className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs">
                    <SelectValue placeholder="Selecione o medicamento..." />
                  </SelectTrigger>
                  <SelectContent>
                    {medicines.map((m) => {
                      let dosageStr = '';
                      if (m.dosage) {
                        dosageStr = ' — ' + m.dosage;
                      }
                      let totalQty = 0;
                      if (m.totalQuantity !== null && m.totalQuantity !== undefined) {
                        totalQty = m.totalQuantity;
                      } else {
                        totalQty = 0;
                      }
                      return (
                        <SelectItem key={m.id} value={String(m.id)} className="text-xs">
                          {m.name}{dosageStr} ({totalQty} un. disponíveis)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Data & Horário */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Data *
                  </Label>
                  <Input
                    type="date"
                    required
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Horário Sugerido
                  </Label>
                  <Input
                    type="time"
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>
              </div>

              {/* Quantidade */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Quantidade de Unidades
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>

              {/* Observações */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Observações
                </Label>
                <Textarea
                  rows={2}
                  placeholder="Informações adicionais..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createAppointmentMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs"
                >
                  {(() => {
                    if (createAppointmentMutation.isPending) {
                      return 'Salvando...';
                    } else {
                      return 'Confirmar Agendamento';
                    }
                  })()}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ==================== DETAILS MODAL ==================== */}
        <Dialog
          open={selectedAppointmentForDetails !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedAppointmentForDetails(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-[500px] rounded-3xl">
            {(() => {
              if (!selectedAppointmentForDetails) {
                return null;
              }
              const app = selectedAppointmentForDetails;
              const scheduled = new Date(app.scheduledDate);
              let dateStr = '—';
              if (Number.isNaN(scheduled.getTime())) {
                dateStr = '—';
              } else {
                dateStr = scheduled.toLocaleDateString('pt-BR');
              }

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

                    {/* Itens */}
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

                    {/* Observações */}
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

                  <DialogFooter className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedAppointmentForDetails(null)}
                      className="rounded-xl text-xs"
                    >
                      Fechar
                    </Button>
                  </DialogFooter>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Cancel Confirmation Dialog */}
        <AlertDialog open={appointmentToCancel !== null} onOpenChange={() => setAppointmentToCancel(null)}>
          <AlertDialogContent className="rounded-2xl max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                <XCircle className="w-5 h-5" />
                Cancelar Agendamento
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza de que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Não, manter</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmCancel}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
              >
                Sim, cancelar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  );
}

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