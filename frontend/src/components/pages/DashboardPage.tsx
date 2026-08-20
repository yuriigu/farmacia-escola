'use client';

import { useMemo, useEffect, useState } from 'react';
import {
  Package, Calendar, CalendarDays, Trash2, ArrowUpRight,
  TrendingUp, Clock,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useAuthStore } from '@/lib/auth-store';
import { usePharmacyStore } from '@/lib/pharmacy-store';
import { CHART_COLORS, APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_STYLES } from '@/lib/constants';
import { ChartTooltipContent } from '@/components/shared/ChartTooltipContent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

function useAnimatedCounter(target: number, duration = 600) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let raf: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

function PatientDashboard({ onNavigate }: { onNavigate: (mod: string, tab?: string) => void }) {
  const { appointments } = usePharmacyStore();
  const user = useAuthStore((s) => s.user);

  // Filter appointments for this patient
  const myAppointments = appointments.filter(a =>
    a.patient?.id === user?.patientId
  ).sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());

  return (
    <div className="space-y-6 page-enter">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Olá, {user?.name?.split(' ')[0] || 'Paciente'} 👋
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Bem-vindo(a) ao sistema da Farmácia Escola
          </p>
        </div>
        <Button onClick={() => onNavigate('calendario', 'agendamentos')} className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
          <Calendar className="w-4 h-4" />
          Agendar Consulta
        </Button>
      </div>

      {/* Upcoming appointments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            Suas Consultas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myAppointments.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum agendamento encontrado.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myAppointments.slice(0, 10).map((app) => {
                const d = new Date(app.scheduledDate);
                return (
                  <div key={app.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex flex-col items-center justify-center text-emerald-600 text-[10px] font-bold leading-tight">
                        <span>{d.toLocaleDateString('pt-BR', { day: 'numeric' })}</span>
                        <span className="text-[8px] font-medium">{d.toLocaleDateString('pt-BR', { month: 'short' })}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{app.items?.[0]?.medicine?.name || 'Medicamento'}</p>
                        <p className="text-xs text-slate-400">{d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} — {d.toLocaleDateString('pt-BR')}</p>
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

export function DashboardPage({ onNavigate }: { onNavigate: (mod: string, tab?: string) => void }) {
  const { medicines, appointments, withdrawals, disposals, loading } = usePharmacyStore();
  const user = useAuthStore((s) => s.user);
  const totalItems = medicines.reduce((sum, m) => sum + (m.totalQuantity ?? 0), 0);
  const activeAppointments = appointments.filter((a) => a.status !== 'CANCELLED').length;

  // Animated counters
  const animTotal = useAnimatedCounter(totalItems);
  const animAppointments = useAnimatedCounter(activeAppointments);
  const animWithdrawals = useAnimatedCounter(withdrawals.length);
  const animDisposals = useAnimatedCounter(disposals.length);

  const maxStock = Math.max(...medicines.map((m) => m.totalQuantity ?? 0), 1);
  const stockPct = totalItems > 0 ? Math.min(Math.round((medicines.reduce((s, m) => s + Math.max(0, m.totalQuantity ?? 0), 0) / (maxStock * medicines.length || 1)) * 100), 100) : 0;
  const stockColor = stockPct > 60 ? 'bg-emerald-500' : stockPct > 30 ? 'bg-amber-500' : 'bg-rose-500';

  // Dynamic trends
  const pendingAppointments = appointments.filter((a) => a.status === 'PENDING').length;
  const appointmentRatio = appointments.length > 0 ? Math.round((pendingAppointments / appointments.length) * 100) : 0;

  const withdrawalTotalQty = withdrawals.reduce((s, w) => s + w.quantity, 0);

  const disposalTotalQty = disposals.reduce((s, d) => s + d.quantity, 0);

  const stats = [
    {
      title: 'Itens em Estoque',
      value: animTotal.toLocaleString('pt-BR'),
      icon: Package,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30',
      accent: 'bg-emerald-500',
      module: 'estoque' as string,
      tab: 'medicamentos',
      bar: stockPct,
      barColor: stockColor,
      change: totalItems > 0 ? `${medicines.length} tipos` : '0',
      up: true,
      showTrend: false,
    },
    {
      title: 'Atendimentos',
      value: String(animAppointments),
      icon: Calendar,
      color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30',
      accent: 'bg-teal-500',
      module: 'calendario' as string,
      tab: 'agendamentos',
      bar: Math.min(activeAppointments * 10, 100),
      barColor: activeAppointments > 5 ? 'bg-teal-500' : 'bg-amber-500',
      change: appointments.length > 0 ? `${appointmentRatio}% pendentes` : '0',
      up: true,
      showTrend: false,
    },
    {
      title: 'Retiradas',
      value: String(animWithdrawals),
      icon: ArrowUpRight,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30',
      accent: 'bg-amber-500',
      module: 'estoque' as string,
      tab: 'retiradas',
      bar: Math.min(withdrawals.length * 15, 100),
      barColor: 'bg-amber-500',
      change: withdrawalTotalQty > 0 ? `${withdrawalTotalQty} un. total` : '0',
      up: true,
      showTrend: false,
    },
    {
      title: 'Descartes',
      value: String(animDisposals),
      icon: Trash2,
      color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/30',
      accent: 'bg-rose-500',
      module: 'estoque' as string,
      tab: 'descartes',
      bar: Math.min(disposals.length * 20, 100),
      barColor: 'bg-rose-500',
      change: disposalTotalQty > 0 ? `${disposalTotalQty} un. total` : '0',
      up: false,
      showTrend: false,
    },
  ];

  const nextAppointments = appointments
    .filter((a) => a.status === 'PENDING' || a.status === 'CONFIRMED')
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 3);

  // ---- Chart Data ----
  const appointmentPieData = useMemo(() => {
    const counts: Record<string, number> = {};
    appointments.forEach((a) => { counts[a.status] = (counts[a.status] || 0) + 1; });
    return Object.entries(APPOINTMENT_STATUS_LABELS).map(([key, label]) => ({
      name: label,
      value: counts[key] || 0,
    })).filter((d) => d.value > 0);
  }, [appointments]);

  const withdrawalByMedicineData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const byMedicine: Record<string, number> = {};
    withdrawals.forEach((w) => {
      if (w.createdAt) {
        const d = new Date(w.createdAt);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          const name = w.batch.medicine.name;
          byMedicine[name] = (byMedicine[name] || 0) + w.quantity;
        }
      }
    });
    return Object.entries(byMedicine)
      .sort((a, b) => b[1] - a[1])
      .map(([name, quantidade]) => ({ name: name.length > 15 ? name.slice(0, 15) + '…' : name, quantidade }));
  }, [withdrawals]);

  const isPatient = user?.role === 'PACIENTE';
  if (isPatient) {
    return <PatientDashboard onNavigate={onNavigate} />;
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Greeting with avatar */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-md shadow-emerald-500/20">
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{'Olá, '}<span className="gradient-text-emerald">{user?.name?.split(' ')[0] || 'Usuário'}</span></h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Bem-vindo ao painel de gestão</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-xl skeleton-shimmer" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-24 skeleton-shimmer" />
                  <Skeleton className="h-7 w-16 skeleton-shimmer" />
                </div>
              </div>
              <div className="mt-3"><Skeleton className="h-1.5 w-full rounded-full skeleton-shimmer" /></div>
            </div>
          ))
        ) : stats.map((s) => {
          const Icon = s.icon;
          return (
            <button key={s.title} onClick={() => onNavigate(s.module, s.tab)} className="text-left card-glass p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4 hover:border-emerald-300 dark:hover:border-emerald-700 hover:-translate-y-0.5 transition-all active:scale-[0.98] relative overflow-hidden group card-hover-lift card-gradient-border stat-card-glow hover-shine">
              <div className={'absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ' + s.accent} />
              <div className={'p-3 rounded-xl transition-transform group-hover:scale-110 ' + s.color}><Icon className="w-6 h-6" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{s.title}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 counter-animate">{s.value}</p>
                  <span className={'text-xs font-medium text-slate-400 dark:text-slate-500'}>
                    {s.change}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={'h-full rounded-full transition-all duration-700 ' + s.barColor} style={{ width: s.bar + '%' }} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Charts Row: Pie + Retiradas Bar Chart side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointment Pie Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-5 h-5 text-teal-600" />
              Status de Agendamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : appointmentPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={appointmentPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" nameKey="name">
                    {appointmentPieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<ChartTooltipContent />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-100 to-teal-50 dark:from-teal-900/30 dark:to-teal-900/10 text-teal-500 flex items-center justify-center mb-3">
                  <Calendar className="w-8 h-8" />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sem agendamentos</p>
                <p className="text-xs text-slate-400 mt-1">Crie agendamentos para visualizar o gráfico.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Retiradas Bar Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-5 h-5 text-amber-600" />
              Retiradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full rounded-xl" />
            ) : withdrawalByMedicineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={withdrawalByMedicineData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <RechartsTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="quantidade" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-900/10 text-amber-500 flex items-center justify-center mb-3">
                  <TrendingUp className="w-7 h-7" />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sem dados de retiradas</p>
                <p className="text-xs text-slate-400 mt-1">Registre retiradas para ver o gráfico.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Próximos Agendamentos */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Calendar className="w-5 h-5 text-teal-600" />Próximos Agendamentos</CardTitle></CardHeader>
        <CardContent>
          {nextAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-100 to-teal-50 dark:from-teal-900/30 dark:to-teal-900/10 text-teal-600 flex items-center justify-center mb-3">
                <CalendarDays className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-teal-700 dark:text-teal-400">Sem agendamentos pendentes</p>
              <p className="text-xs text-slate-400 mt-1">Nenhum agendamento nos próximos dias.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {nextAppointments.map((app) => {
                const scheduled = new Date(app.scheduledDate);
                const dateLabel = Number.isNaN(scheduled.getTime()) ? '-' : scheduled.toLocaleDateString('pt-BR');
                const timeLabel = Number.isNaN(scheduled.getTime()) ? '-' : scheduled.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={app.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{app.items?.[0]?.medicine?.name ?? 'Medicamento não informado'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{app.patient?.name ?? 'Paciente não informado'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{timeLabel}</p>
                      <p className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">{dateLabel}</p>
                    </div>
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
