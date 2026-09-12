'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Package, Calendar, ArrowUpRight, Trash2, Clock,
  CalendarDays, CheckCircle2, AlertTriangle, AlertCircle, Plus, Search,
  ShieldAlert, User, FileText, ChevronRight, CheckCircle
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { useAuthStore } from '@/lib/auth-store';
import { useMedicines, useAppointments, useBatches } from '@/services/queries';
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_STYLES, CHART_COLORS } from '@/lib/constants';
import { computeStockStatus, type StockStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartTooltipContent } from '@/components/shared/chart-tooltip-content';

export function DashboardPage({ onNavigate }: { onNavigate?: (mod: string, tab?: string) => void }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  let isPatient = false;
  if (user) {
    if (user.role === 'PACIENTE') {
      isPatient = true;
    }
  }

  const { data: medicines = [], isLoading: loadingMeds } = useMedicines();
  const { data: appointments = [], isLoading: loadingApps } = useAppointments();
  const { data: batches = [], isLoading: loadingBatches } = useBatches();

  const totalStockUnits = useMemo(() => {
    return medicines.reduce((sum, m) => {
      let qty = 0;
      if (m.totalQuantity !== undefined && m.totalQuantity !== null) {
        qty = m.totalQuantity;
      }
      return sum + qty;
    }, 0);
  }, [medicines]);

  // Unified Taxonomy Metrics
  const stockTaxonomyCounts = useMemo(() => {
    let ok = 0;
    let low = 0;
    let critical = 0;
    let expired = 0;

    medicines.forEach((m) => {
      const status = computeStockStatus(m);
      if (status === 'ok') ok++;
      else if (status === 'low') low++;
      else if (status === 'critical') critical++;
      else if (status === 'expired') expired++;
    });

    return { ok, low, critical, expired };
  }, [medicines]);

  const activeAppointments = appointments.filter((a) => a.status !== 'CANCELLED');
  const pendingAppointments = appointments.filter((a) => a.status === 'PENDING');

  // Chart data for appointments
  const appointmentPieData = useMemo(() => {
    const counts: Record<string, number> = {};
    appointments.forEach((a) => {
      let current = 0;
      if (counts[a.status]) {
        current = counts[a.status];
      }
      counts[a.status] = current + 1;
    });
    return Object.entries(APPOINTMENT_STATUS_LABELS)
      .map(([key, label]) => {
        let val = 0;
        if (counts[key]) {
          val = counts[key];
        }
        return {
          name: label,
          value: val,
        };
      })
      .filter((d) => d.value > 0);
  }, [appointments]);

  // Stock status pie data
  const stockStatusPieData = useMemo(() => {
    return [
      { name: 'Em dia', value: stockTaxonomyCounts.ok, color: '#10b981' },
      { name: 'Baixo', value: stockTaxonomyCounts.low, color: '#f59e0b' },
      { name: 'Crítico', value: stockTaxonomyCounts.critical, color: '#ef4444' },
      { name: 'Vencido', value: stockTaxonomyCounts.expired, color: '#9333ea' },
    ].filter((d) => d.value > 0);
  }, [stockTaxonomyCounts]);

  // Chart data for top medicines
  const stockByMedData = useMemo(() => {
    return medicines
      .slice(0, 6)
      .map((m) => {
        let nameStr = m.name;
        if (m.name.length > 12) {
          nameStr = m.name.slice(0, 12) + '…';
        }
        let qty = 0;
        if (m.totalQuantity !== undefined && m.totalQuantity !== null) {
          qty = m.totalQuantity;
        }
        return {
          name: nameStr,
          quantidade: qty,
        };
      });
  }, [medicines]);

  // Upcoming appointments
  const upcomingAppointments = appointments
    .filter((a) => {
      if (a.status === 'PENDING') {
        return true;
      }
      if (a.status === 'CONFIRMED') {
        return true;
      }
      return false;
    })
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 4);

  if (isPatient) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto page-enter">
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
            {(() => {
              if (upcomingAppointments.length === 0) {
                return (
                  <div className="text-center py-10 space-y-3">
                    <CalendarDays className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                      Você não tem nenhum agendamento pendente.
                    </p>
                    <Button asChild size="sm" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                      <Link href="/appointments?new=1">
                        <Plus className="w-4 h-4 mr-1" />
                        Agendar Retirada
                      </Link>
                    </Button>
                  </div>
                );
              } else {
                return (
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
                                {(() => {
                                  if (app.items) {
                                    if (app.items.length > 0) {
                                      if (app.items[0].medicine) {
                                        if (app.items[0].medicine.name) {
                                          return app.items[0].medicine.name;
                                        }
                                      }
                                    }
                                  }
                                  return 'Consulta Farmacêutica';
                                })()}
                                {(() => {
                                  if (app.items) {
                                    if (app.items.length > 1) {
                                      return ` (+${app.items.length - 1} itens)`;
                                    }
                                  }
                                  return null;
                                })()}
                              </p>
                              <p className="text-xs text-slate-400">
                                Horário: {(() => {
                                  if (app.scheduledTime) {
                                    return app.scheduledTime;
                                  }
                                  return '09:00';
                                })()} • {d.toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>

                          <Badge
                            variant="outline"
                            className={(() => {
                              if (APPOINTMENT_STATUS_STYLES[app.status]) {
                                return APPOINTMENT_STATUS_STYLES[app.status];
                              }
                              return '';
                            })()}
                          >
                            {(() => {
                              if (APPOINTMENT_STATUS_LABELS[app.status]) {
                                return APPOINTMENT_STATUS_LABELS[app.status];
                              }
                              return app.status;
                            })()}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                );
              }
            })()}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Staff Dashboard (ADMIN, FARMACEUTICO, PACIENTE, ALUNO e MEDICO)
  return (
    <div className="space-y-6 max-w-7xl mx-auto page-enter">
      {/* Unified Stock Taxonomy KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Stock */}
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
                {totalStockUnits.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-400">un.</span>
              </p>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">{medicines.length} itens cadastrados</p>
            </div>
          </div>
        </Link>

        {/* Em Dia */}
        <Link
          href="/medicines"
          className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all group block"
        >
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-emerald-100/70 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 rounded-2xl group-hover:scale-110 transition-transform">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estoque Em Dia</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {stockTaxonomyCounts.ok}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Saldo seguro e no prazo</p>
            </div>
          </div>
        </Link>

        {/* Baixo / Crítico */}
        <Link
          href="/medicines"
          className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-amber-300 transition-all group block"
        >
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estoque Baixo / Crítico</p>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {stockTaxonomyCounts.low + stockTaxonomyCounts.critical}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {stockTaxonomyCounts.low} baixo • {stockTaxonomyCounts.critical} crítico
              </p>
            </div>
          </div>
        </Link>

        {/* Vencidos */}
        <Link
          href="/estoque"
          className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-purple-300 transition-all group block"
        >
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-2xl group-hover:scale-110 transition-transform">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Itens Vencidos</p>
              <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
                {stockTaxonomyCounts.expired}
              </p>
              <p className="text-[11px] text-purple-500 font-medium mt-0.5">Necessitam descarte</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Sanitary Block Alert Banner */}
      {(() => {
        const blockedBatches = batches.filter((b) => b.isBlocked);
        if (blockedBatches.length > 0) {
          let pluralText = 'lotes com bloqueio ativo';
          if (blockedBatches.length === 1) {
            pluralText = 'lote com bloqueio ativo';
          }
          return (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 dark:bg-rose-900/50 text-rose-600 rounded-xl">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-rose-800 dark:text-rose-200">
                    Atenção Sanitária: {blockedBatches.length} {pluralText}
                  </p>
                  <p className="text-xs text-rose-600 dark:text-rose-300">
                    Estes lotes estão retidos e impedidos de dispensação pelo algoritmo FEFO.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="border-rose-300 text-rose-700 hover:bg-rose-100 rounded-xl text-xs">
                <Link href="/estoque">Gerenciar Lotes</Link>
              </Button>
            </div>
          );
        }
        return null;
      })()}

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
            {(() => {
              if (appointmentPieData.length > 0) {
                return (
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
                );
              } else {
                return (
                  <div className="py-12 text-center text-slate-400 text-sm">
                    Nenhum agendamento registrado ainda.
                  </div>
                );
              }
            })()}
          </CardContent>
        </Card>

        {/* Stock Status Distribution Bar Chart */}
        <Card className="rounded-3xl border-slate-200 dark:border-slate-700 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              Panorama por Status de Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              if (medicines.length > 0) {
                return (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={[
                        { name: 'Em dia', quantidade: stockTaxonomyCounts.ok, fill: '#10b981' },
                        { name: 'Baixo', quantidade: stockTaxonomyCounts.low, fill: '#f59e0b' },
                        { name: 'Crítico', quantidade: stockTaxonomyCounts.critical, fill: '#ef4444' },
                        { name: 'Vencido', quantidade: stockTaxonomyCounts.expired, fill: '#9333ea' },
                      ]}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                      <RechartsTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="quantidade" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                );
              } else {
                return (
                  <div className="py-12 text-center text-slate-400 text-sm">
                    Nenhum medicamento com estoque cadastrado.
                  </div>
                );
              }
            })()}
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
          {(() => {
            if (upcomingAppointments.length === 0) {
              return (
                <div className="py-8 text-center text-slate-400 text-sm">
                  Nenhum agendamento pendente nos próximos dias.
                </div>
              );
            } else {
              return (
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
                              {(() => {
                                if (app.patient) {
                                  if (app.patient.name) {
                                    return app.patient.name;
                                  }
                                }
                                return 'Paciente';
                              })()}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {(() => {
                                let medName = 'Retirada';
                                if (app.items) {
                                  if (app.items.length > 0) {
                                    if (app.items[0].medicine) {
                                      if (app.items[0].medicine.name) {
                                        medName = app.items[0].medicine.name;
                                      }
                                    }
                                  }
                                }
                                let timeStr = '';
                                if (app.scheduledTime) {
                                  timeStr = ` às ${app.scheduledTime}`;
                                }
                                return `${medName}${timeStr}`;
                              })()}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={(() => {
                            if (APPOINTMENT_STATUS_STYLES[app.status]) {
                              return APPOINTMENT_STATUS_STYLES[app.status];
                            }
                            return '';
                          })()}
                        >
                          {(() => {
                            if (APPOINTMENT_STATUS_LABELS[app.status]) {
                              return APPOINTMENT_STATUS_LABELS[app.status];
                            }
                            return app.status;
                          })()}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              );
            }
          })()}
        </CardContent>
      </Card>
    </div>
  );
}