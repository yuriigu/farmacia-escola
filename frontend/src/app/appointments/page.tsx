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
} from '@/services/queries';
import { useAuthStore } from '@/lib/auth-store';
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_STYLES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from '@/components/ui/dialog';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Appointment } from '@/lib/types';

function AppointmentsContent() {
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const isPatient = user?.role === 'PACIENTE';
  const isStaff = user?.role === 'ADMIN' || user?.role === 'FARMACEUTICO' || user?.role === 'ALUNO';

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
  const initialNew = searchParams.get('new') === '1' || !!searchParams.get('medicineId');
  const initialMedId = searchParams.get('medicineId') ? Number(searchParams.get('medicineId')) : undefined;

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

    createAppointmentMutation.mutate(
      {
        scheduledDate: appointmentDate,
        scheduledTime: appointmentTime,
        patientId: isPatient ? undefined : selectedPatientId,
        notes: notes.trim() || undefined,
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
          toast.error(err?.message || 'Erro ao criar agendamento.');
        },
      }
    );
  };

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((app) => {
      const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
      const matchesSearch =
        (app.patient?.name && app.patient.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (app.patient?.cpf && app.patient.cpf.includes(searchTerm)) ||
        (app.items && app.items.some((i) => i.medicine?.name.toLowerCase().includes(searchTerm.toLowerCase()))) ||
        (app.notes && app.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesStatus && matchesSearch;
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
          toast.error(err?.message || 'Erro ao cancelar agendamento.');
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
        const dateStr = Number.isNaN(scheduled.getTime()) ? '—' : scheduled.toLocaleDateString('pt-BR');
        const timeStr = app.scheduledTime || (Number.isNaN(scheduled.getTime()) ? '' : scheduled.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));

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
        const name = app.patient?.name || (isPatient ? user?.name : 'Não informado');
        const cpf = app.patient?.cpf;
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
        const firstItem = app.items?.[0];
        const medName = firstItem?.medicine?.name || 'Medicamento não especificado';
        const dosage = firstItem?.medicine?.dosage;
        const qty = firstItem?.quantity || 1;
        const totalItems = app.items?.length || 0;

        return (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
              <Pill className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                {medName} {dosage ? <span className="text-slate-400 text-xs">({dosage})</span> : null}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Quantidade: <span className="font-semibold text-slate-700 dark:text-slate-300">{qty} un.</span>
                {totalItems > 1 && (
                  <span className="ml-1.5 text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                    +{totalItems - 1} outro(s)
                  </span>
                )}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Status',
      width: '130px',
      cell: (app) => (
        <Badge
          variant="outline"
          className={`font-semibold text-[11px] ${APPOINTMENT_STATUS_STYLES[app.status] || APPOINTMENT_STATUS_STYLES.PENDING}`}
        >
          {APPOINTMENT_STATUS_LABELS[app.status] || app.status}
        </Badge>
      ),
    },
    {
      header: 'Ações',
      align: 'right',
      width: '150px',
      cell: (app) => {
        // Strict IDOR & RBAC validation:
        // A patient can only cancel appointments that belong to their own patient profile.
        const isOwner = isPatient
          ? (app.patientId === user?.patientId || (user?.patientId && app.patient?.id === user.patientId))
          : true;

        const canCancel = (isStaff || (isPatient && isOwner)) && (app.status === 'PENDING' || app.status === 'CONFIRMED');

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

  return (
    <AppShell activeModuleId={'appointments' as any} pageTitle="Agendamentos de Retirada">
      <div className="space-y-5 max-w-7xl mx-auto page-enter">
        {/* Standard PageHeader */}
        <PageHeader
          title="Agendamentos de Retirada"
          description={
            isPatient
              ? 'Acompanhe o status e as datas das suas consultas e retiradas agendadas.'
              : 'Gerenciamento completo das solicitações e atendimentos da Farmácia Escola.'
          }
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
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto no-scrollbar">
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'PENDING', label: 'Pendentes' },
              { id: 'CONFIRMED', label: 'Confirmados' },
              { id: 'COMPLETED', label: 'Concluídos' },
              { id: 'CANCELLED', label: 'Cancelados' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === tab.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
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
                {isPatient
                  ? 'Agende a data e o horário para retirar seu medicamento gratuito.'
                  : 'Registre um novo agendamento de atendimento farmacêutico.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
              {/* Patient Selector for Staff */}
              {!isPatient && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    Paciente *
                  </Label>
                  <Select
                    value={selectedPatientId ? String(selectedPatientId) : ''}
                    onValueChange={(v) => setSelectedPatientId(Number(v))}
                  >
                    <SelectTrigger className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs">
                      <SelectValue placeholder="Selecione o paciente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                          {p.name} {p.cpf ? `(CPF: ${p.cpf})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Medicine Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <Pill className="w-3.5 h-3.5 text-emerald-600" />
                  Medicamento *
                </Label>
                <Select
                  value={selectedMedId ? String(selectedMedId) : ''}
                  onValueChange={(v) => setSelectedMedId(Number(v))}
                >
                  <SelectTrigger className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs">
                    <SelectValue placeholder="Selecione o medicamento..." />
                  </SelectTrigger>
                  <SelectContent>
                    {medicines.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)} className="text-xs">
                        {m.name} {m.dosage ? `— ${m.dosage}` : ''} ({m.totalQuantity ?? 0} un. disponíveis)
                      </SelectItem>
                    ))}
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
                  {createAppointmentMutation.isPending ? 'Salvando...' : 'Confirmar Agendamento'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ==================== DETAILS MODAL ==================== */}
        <Dialog
          open={selectedAppointmentForDetails !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedAppointmentForDetails(null);
          }}
        >
          <DialogContent className="sm:max-w-[500px] rounded-3xl">
            {selectedAppointmentForDetails && (() => {
              const app = selectedAppointmentForDetails;
              const scheduled = new Date(app.scheduledDate);
              const dateStr = Number.isNaN(scheduled.getTime()) ? '—' : scheduled.toLocaleDateString('pt-BR');
              const firstItem = app.items?.[0];

              return (
                <div className="space-y-4">
                  <DialogHeader>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className={`font-semibold text-[11px] ${APPOINTMENT_STATUS_STYLES[app.status] || APPOINTMENT_STATUS_STYLES.PENDING}`}
                      >
                        {APPOINTMENT_STATUS_LABELS[app.status] || app.status}
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
                          {app.patient?.name || (isPatient ? user?.name : 'Não informado')}
                        </span>
                      </div>
                      {app.patient?.cpf && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">CPF:</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {app.patient.cpf}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Data Agendada:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {dateStr} {app.scheduledTime ? `às ${app.scheduledTime}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Itens */}
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        Medicamento(s) Solicitados
                      </h4>
                      {app.items && app.items.length > 0 ? (
                        app.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-800 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <Pill className="w-4 h-4 text-emerald-600" />
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {item.medicine?.name}
                              </span>
                              {item.medicine?.dosage && (
                                <span className="text-slate-400">({item.medicine.dosage})</span>
                              )}
                            </div>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">
                              {item.quantity} un.
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400">Nenhum item listado.</p>
                      )}
                    </div>

                    {/* Observações */}
                    {app.notes && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl text-xs text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                        <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Observações:</span>
                        {app.notes}
                      </div>
                    )}
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