'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Package, Calendar, ArrowUpRight, Trash2, Clock,
  CalendarDays, CheckCircle2, AlertCircle, Plus, Search,
  Boxes, ShieldAlert, Sparkles, User, FileText, ChevronRight
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { useAuthStore } from '@/lib/auth-store';
import { useMedicines, useAppointments, useBatches } from '@/services/queries';
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_STYLES, CHART_COLORS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartTooltipContent } from '@/components/shared/ChartTooltipContent';

export function DashboardPage({ onNavigate }: { onNavigate?: (mod: string, tab?: string) => void }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isPatient = user?.role === 'PACIENTE';
  const isStaff = user?.role === 'ADMIN' || user?.role === 'FARMACEUTICO' || user?.role === 'ALUNO';

  const { data: medicines = [], isLoading: loadingMeds } = useMedicines();
  const { data: appointments = [], isLoading: loadingApps } = useAppointments();
  const { data: batches = [], isLoading: loadingBatches } = useBatches();

  const totalStockItems = medicines.reduce((sum, m) => sum + (m.totalQuantity ?? 0), 0);
  const outOfStockCount = medicines.filter((m) => (m.totalQuantity ?? 0) <= 0).length;
  const activeAppointments = appointments.filter((a) => a.status !== 'CANCELLED');
  const pendingAppointments = appointments.filter((a) => a.status === 'PENDING');

  // Chart data for appointments
  const appointmentPieData = useMemo(() => {
    const counts: Record<string, number> = {};
    appointments.forEach((a) => {
      counts[a.status] = (counts[a.status] || 0) + 1;
    });
    return Object.entries(APPOINTMENT_STATUS_LABELS)
      .map(([key, label]) => ({
        name: label,
        value: counts[key] || 0,
      }))
      .filter((d) => d.value > 0);
  }, [appointments]);

  // Chart data for stock
  const stockByMedData = useMemo(() => {
    return medicines
      .slice(0, 6)
      .map((m) => ({
        name: m.name.length > 12 ? m.name.slice(0, 12) + '…' : m.name,
        quantidade: m.totalQuantity ?? 0,
      }));
  }, [medicines]);

  // Upcoming appointments
  const upcomingAppointments = appointments
    .filter((a) => a.status === 'PENDING' || a.status === 'CONFIRMED')
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 4);

  if (isPatient) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto page-enter">
        {/* Welcome Banner for Patient */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 sm:p-8 rounded-3xl text-white shadow-xl shadow-emerald-900/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5" />
              Portal do Paciente
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Olá, {user?.name?.split(' ')[0] || 'Paciente'}!
            </h1>
            <p className="text-emerald-100 text-sm max-w-xl">
              Consulte medicamentos gratuitos disponíveis e agende sua retirada com facilidade.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              className="bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl font-bold shadow-md shadow-black/10 gap-2"
            >
              <Link href="/appointments/new">
                <Calendar className="w-4 h-4" />
                Novo Agendamento
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/40 text-white hover:bg-white/10 rounded-xl font-bold gap-2"
            >
              <Link href="/medicines">
                <Search className="w-4 h-4" />
                Buscar Medicamentos
              </Link>
            </Button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="rounded-2xl border-slate-200 dark:border-slate-700 p-5 shadow-sm bg-white dark:bg-slate-800">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Agendamentos Ativos</p>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
                  {activeAppointments.length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border-slate-200 dark:border-slate-700 p-5 shadow-sm bg-white dark:bg-slate-800">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-teal-50 dark:bg-teal-950/40 text-teal-600 rounded-xl">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Medicamentos no Catálogo</p>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
                  {medicines.length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border-slate-200 dark:border-slate-700 p-5 shadow-sm bg-white dark:bg-slate-800">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Aguardando Confirmação</p>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
                  {pendingAppointments.length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Appointments Section */}
        <Card className="rounded-3xl border-slate-200 dark:border-slate-700 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <Calendar className="w-5 h-5 text-emerald-600" />
              Seus Próximos Agendamentos
            </CardTitle>
            <Button asChild size="sm" variant="ghost" className="rounded-xl text-xs gap-1">
              <Link href="/appointments">
                Ver todos
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <CalendarDays className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                  Você não tem nenhum agendamento pendente.
                </p>
                <Button asChild size="sm" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  <Link href="/appointments/new">
                    <Plus className="w-4 h-4 mr-1" />
                    Agendar Retirada
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((app) => {
                  const d = new Date(app.scheduledDate);
                  return (
                    <div
                      key={app.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex flex-col items-center justify-center font-bold text-xs">
                          <span>{d.toLocaleDateString('pt-BR', { day: 'numeric' })}</span>
                          <span className="text-[9px] uppercase">{d.toLocaleDateString('pt-BR', { month: 'short' })}</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {app.items?.[0]?.medicine?.name || 'Consulta Farmacêutica'}
                            {app.items && app.items.length > 1 && ` (+${app.items.length - 1} itens)`}
                          </p>
                          <p className="text-xs text-slate-400">
                            Horário: {app.scheduledTime || '09:00'} • {d.toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      <Badge variant="outline" className={APPOINTMENT_STATUS_STYLES[app.status] || ''}>
                        {APPOINTMENT_STATUS_LABELS[app.status] || app.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Staff Dashboard (ADMIN, FARMACEUTICO, ALUNO)
  return (
    <div className="space-y-6 max-w-7xl mx-auto page-enter">
      {/* Top Banner with Quick Actions */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-800 p-6 sm:p-8 rounded-3xl text-white shadow-xl shadow-slate-900/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            Painel Geral Farmacêutico
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Olá, {user?.name?.split(' ')[0] || 'Usuário'}!
          </h1>
          <p className="text-emerald-100 text-sm max-w-xl">
            Visão consolidada do estoque, agendamentos e atendimento universitário.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Button
            asChild
            className="bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl font-bold shadow-md shadow-black/10 text-xs"
          >
            <Link href="/medicines">
              <Package className="w-4 h-4 mr-1.5" />
              Medicamentos
            </Link>
          </Button>

          <Button
            asChild
            className="bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold text-xs"
          >
            <Link href="/admin/stock">
              <Boxes className="w-4 h-4 mr-1.5" />
              Gerenciar Lotes
            </Link>
          </Button>

          <Button
            asChild
            className="bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold text-xs"
          >
            <Link href="/appointments/new">
              <Plus className="w-4 h-4 mr-1.5" />
              Agendar Atendimento
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/medicines"
          className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all group block"
        >
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total em Estoque</p>
              <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
                {totalStockItems.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-400">un.</span>
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/appointments"
          className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-teal-300 transition-all group block"
        >
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-teal-50 dark:bg-teal-950/40 text-teal-600 rounded-2xl group-hover:scale-110 transition-transform">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Agendamentos</p>
              <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
                {appointments.length}
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/stock"
          className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-amber-300 transition-all group block"
        >
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lotes Registrados</p>
              <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
                {batches.length}
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/medicines"
          className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-rose-300 transition-all group block"
        >
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-2xl group-hover:scale-110 transition-transform">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Itens em Falta</p>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
                {outOfStockCount}
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments Status Pie */}
        <Card className="rounded-3xl border-slate-200 dark:border-slate-700 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-600" />
              Distribuição de Agendamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {appointmentPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={appointmentPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="name"
                  >
                    {appointmentPieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-12 text-center text-slate-400 text-sm">
                Nenhum agendamento registrado ainda.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock by Medicine Bar Chart */}
        <Card className="rounded-3xl border-slate-200 dark:border-slate-700 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              Estoque dos Principais Medicamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stockByMedData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stockByMedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <RechartsTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="quantidade" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-12 text-center text-slate-400 text-sm">
                Nenhum medicamento com estoque cadastrado.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Next Appointments List */}
      <Card className="rounded-3xl border-slate-200 dark:border-slate-700 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Clock className="w-4 h-4 text-teal-600" />
            Próximos Atendimentos Agendados
          </CardTitle>
          <Button asChild size="sm" variant="ghost" className="rounded-xl text-xs gap-1">
            <Link href="/appointments">
              Ver todos
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {upcomingAppointments.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              Nenhum agendamento pendente nos próximos dias.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {upcomingAppointments.map((app) => {
                const d = new Date(app.scheduledDate);
                return (
                  <div
                    key={app.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 font-bold text-xs flex flex-col items-center justify-center">
                        <span>{d.toLocaleDateString('pt-BR', { day: 'numeric' })}</span>
                        <span className="text-[8px] uppercase">{d.toLocaleDateString('pt-BR', { month: 'short' })}</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {app.patient?.name || 'Paciente'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {app.items?.[0]?.medicine?.name || 'Retirada'} {app.scheduledTime ? `às ${app.scheduledTime}` : ''}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={APPOINTMENT_STATUS_STYLES[app.status] || ''}>
                      {APPOINTMENT_STATUS_LABELS[app.status] || app.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
