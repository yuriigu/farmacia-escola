'use client';

import { Calendar, Package } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartTooltipContent } from '@/components/shared/chart-tooltip-content';
import { CHART_COLORS } from '@/lib/constants';

// props do bloco de graficos. o componente e burro de proposito:
// recebe os dados ja calculados (pizza de agendamento e contagem de
// status de estoque) e so se preocupa em renderizar.
interface DashboardChartsProps {
  appointmentPieData: Array<{ name: string; value: number }>;
  stockTaxonomyCounts: { ok: number; low: number; critical: number; expired: number };
  hasMedicines: boolean;
}

// chunk lazy do dashboard: isola o recharts (~350kb) num chunk
// separado, carregado via next/dynamic so depois do lcp das metricas.
// assim o usuario ve os numeros rapidos e o grafico entra logo em seguida,
// sem atrasar a primeira renderizacao.
export function DashboardCharts({ appointmentPieData, stockTaxonomyCounts, hasMedicines }: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* card 1: pizza com a distribuicao de agendamentos por status.
          as cores vem do chart_colors, ciclando quando ha mais fatias
          do que cores disponiveis. */}
      <Card className="rounded-3xl border-slate-200 dark:border-slate-700 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-600" />
            Distribuição de Agendamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* fallback quando ainda nao ha agendamento: texto discreto
              em vez de tentar renderizar um grafico vazio. */}
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
                {/* tooltip customizado, reutilizado entre os dois graficos */}
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

      {/* card 2: barra com o panorama de estoque por status.
          cada barra tem uma cor fixa (verde/amarelo/vermelho/roxo)
          pra bater com a semantica de cada estado. */}
      <Card className="rounded-3xl border-slate-200 dark:border-slate-700 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-600" />
            Panorama por Status de Estoque
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* fallback quando ainda nao ha medicamento cadastrado. */}
          {hasMedicines ? (
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
          ) : (
            <div className="py-12 text-center text-slate-400 text-sm">
              Nenhum medicamento com estoque cadastrado.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}