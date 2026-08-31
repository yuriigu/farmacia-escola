'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar, Plus, Clock, Pill, Search, X, Check, XCircle,
  Eye, RefreshCw, CalendarDays
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import {
  useAppointments,
  useCancelAppointment,
  useUpdateAppointmentStatus
} from '@/services/queries';
import { useAuthStore } from '@/lib/auth-store';
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_STYLES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
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
import type { Appointment } from '@/lib/types';

export default function AppointmentsPage() {
  const user = useAuthStore((s) => s.user);
  const isPatient = user?.role === 'PACIENTE';
  const isStaff = user?.role === 'ADMIN' || user?.role === 'FARMACEUTICO';

  const { data: appointments = [], isLoading, isError, refetch } = useAppointments();
  const cancelAppointmentMutation = useCancelAppointment();
  const updateStatusMutation = useUpdateAppointmentStatus();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [appointmentToCancel, setAppointmentToCancel] = useState<number | null>(null);

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
        onSuccess: () => setAppointmentToCancel(null),
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
      width: '140px',
      cell: (app) => {
        const canCancel = (isPatient || isStaff) && (app.status === 'PENDING' || app.status === 'CONFIRMED');

        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
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
            <>
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="h-10 rounded-xl gap-2 text-sm font-medium border-slate-200 dark:border-slate-700"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Atualizar</span>
              </Button>

              <Button
                asChild
                className="h-10 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm active:scale-[0.98] transition-transform"
              >
                <Link href="/appointments/new">
                  <Plus className="w-4 h-4" />
                  <span>Novo Agendamento</span>
                </Link>
              </Button>
            </>
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
              asChild
              className="h-9 rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              <Link href="/appointments/new">
                <Plus className="w-3.5 h-3.5" />
                Criar Agendamento
              </Link>
            </Button>
          }
        />

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