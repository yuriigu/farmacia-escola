'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Calendar, Plus, Clock, CheckCircle2, XCircle, AlertCircle,
  Pill, Filter, Search, UserCheck, CalendarDays, RefreshCw, X
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const filteredAppointments = appointments.filter((app) => {
    const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
    const matchesSearch =
      (app.patient?.name && app.patient.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (app.items && app.items.some((i) => i.medicine?.name.toLowerCase().includes(searchTerm.toLowerCase()))) ||
      (app.notes && app.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  const handleConfirmCancel = () => {
    if (appointmentToCancel) {
      cancelAppointmentMutation.mutate(appointmentToCancel, {
        onSuccess: () => setAppointmentToCancel(null),
      });
    }
  };

  return (
    <AppShell activeModuleId={'appointments' as any} pageTitle="Agendamentos de Retirada">
      <div className="space-y-6 max-w-7xl mx-auto page-enter">
        {/* Top Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 p-6 rounded-3xl text-white shadow-xl shadow-teal-900/10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Agendamentos de Retirada</h1>
            <p className="text-teal-100 text-sm mt-1 max-w-xl">
              {isPatient
                ? 'Acompanhe o status e as datas das suas consultas e retiradas agendadas.'
                : 'Gerenciamento completo das solicitações e atendimentos da Farmácia Escola.'}
            </p>
          </div>

          <Button
            asChild
            className="bg-white text-teal-800 hover:bg-teal-50 rounded-xl font-bold shadow-md shadow-black/10 gap-2 shrink-0"
          >
            <Link href="/appointments/new">
              <Plus className="w-4 h-4" />
              Novo Agendamento
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Buscar por medicamento ou paciente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
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
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    statusFilter === tab.id
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Appointments List */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 animate-pulse flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-4 w-64 bg-slate-100 dark:bg-slate-700/60 rounded" />
                </div>
                <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded-xl" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <p className="font-semibold text-slate-800 dark:text-slate-200">Erro ao carregar agendamentos.</p>
            <Button onClick={() => refetch()} variant="outline" className="rounded-xl">
              Tentar Novamente
            </Button>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4">
            <CalendarDays className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Nenhum agendamento encontrado</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Você não possui nenhum agendamento com os filtros selecionados.
            </p>
            <Button asChild className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold">
              <Link href="/appointments/new">
                <Plus className="w-4 h-4 mr-2" />
                Fazer Novo Agendamento
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAppointments.map((app) => {
              const d = new Date(app.scheduledDate);
              const dateStr = Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR');
              const statusStyle = APPOINTMENT_STATUS_STYLES[app.status] || '';
              const statusLabel = APPOINTMENT_STATUS_LABELS[app.status] || app.status;

              return (
                <div
                  key={app.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header: Date + Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex flex-col items-center justify-center font-bold text-xs">
                          <span>{d.toLocaleDateString('pt-BR', { day: 'numeric' })}</span>
                          <span className="text-[9px] uppercase">{d.toLocaleDateString('pt-BR', { month: 'short' })}</span>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Data Agendada</p>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {dateStr} {app.scheduledTime ? `às ${app.scheduledTime}` : ''}
                          </p>
                        </div>
                      </div>

                      <Badge variant="outline" className={`font-semibold ${statusStyle}`}>
                        {statusLabel}
                      </Badge>
                    </div>

                    {/* Patient info if staff */}
                    {!isPatient && app.patient && (
                      <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="font-semibold">Paciente: {app.patient.name}</span>
                        {app.patient.cpf && <span className="font-mono text-slate-400">{app.patient.cpf}</span>}
                      </div>
                    )}

                    {/* Requested items */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Medicamentos Solicitados:
                      </p>
                      {app.items && app.items.length > 0 ? (
                        <div className="space-y-1">
                          {app.items.map((item) => (
                            <div
                              key={item.id}
                              className="text-xs flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300"
                            >
                              <span className="font-medium flex items-center gap-1.5">
                                <Pill className="w-3.5 h-3.5 text-emerald-500" />
                                {item.medicine?.name || 'Medicamento'} {item.medicine?.dosage ? `(${item.medicine.dosage})` : ''}
                              </span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {item.quantity} un.
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Nenhum item discriminado</p>
                      )}
                    </div>

                    {app.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/30 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                        <span className="font-semibold">Obs:</span> {app.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                    {app.status === 'PENDING' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAppointmentToCancel(app.id)}
                        className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl"
                      >
                        Cancelar Agendamento
                      </Button>
                    )}

                    {isStaff && app.status === 'PENDING' && (
                      <div className="flex items-center gap-1.5 ml-auto">
                        <Button
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ id: app.id, status: 'CONFIRMED' })}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold"
                        >
                          Confirmar
                        </Button>
                      </div>
                    )}

                    {isStaff && app.status === 'CONFIRMED' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: app.id, status: 'COMPLETED' })}
                        className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold ml-auto"
                      >
                        Concluir Retirada
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Confirmation Dialog for Cancellation */}
        <AlertDialog open={!!appointmentToCancel} onOpenChange={(open) => !open && setAppointmentToCancel(null)}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar este agendamento?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza de que deseja cancelar este agendamento de retirada? Esta ação não poderá ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Voltar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmCancel}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Confirmar Cancelamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  );
}
