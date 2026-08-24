'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Package, Calendar, CheckCircle2, AlertCircle,
  Clock, ShieldCheck, Tag, Sparkles, Layers, HeartPulse
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useMedicine } from '@/services/queries';
import { useAuthStore } from '@/lib/auth-store';
import { MEDICINE_CATEGORY_LABELS, MEDICINE_CATEGORY_COLORS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MedicineDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);
  const user = useAuthStore((s) => s.user);

  const { data: medicine, isLoading, isError } = useMedicine(id);

  if (isLoading) {
    return (
      <AppShell activeModuleId={'medicines' as any} pageTitle="Detalhes do Medicamento">
        <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
          <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-3xl" />
          <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-3xl" />
        </div>
      </AppShell>
    );
  }

  if (isError || !medicine) {
    return (
      <AppShell activeModuleId={'medicines' as any} pageTitle="Medicamento não encontrado">
        <div className="max-w-md mx-auto text-center py-16 space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Medicamento não encontrado</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            O medicamento solicitado não foi encontrado no sistema ou foi removido.
          </p>
          <Button asChild className="rounded-xl">
            <Link href="/medicines">Voltar para o Catálogo</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const isAvailable = (medicine.totalQuantity ?? 0) > 0;
  const catKey = (medicine.category || 'outro').toLowerCase();
  const categoryLabel = MEDICINE_CATEGORY_LABELS[catKey] || medicine.category || 'Geral';
  const categoryColor = MEDICINE_CATEGORY_COLORS[catKey] || 'bg-slate-100 text-slate-600';

  return (
    <AppShell activeModuleId={'medicines' as any} pageTitle={`Medicamento: ${medicine.name}`}>
      <div className="max-w-4xl mx-auto space-y-6 page-enter">
        {/* Navigation Breadcrumb */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/medicines')}
            className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl gap-2 -ml-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Catálogo
          </Button>
        </div>

        {/* Hero Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${categoryColor}`}>
                  {categoryLabel}
                </span>
                <Badge
                  variant="outline"
                  className={
                    isAvailable
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold'
                      : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 font-bold'
                  }
                >
                  {isAvailable ? `Disponível (${medicine.totalQuantity} un)` : 'Em falta no momento'}
                </Badge>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                {medicine.name}
              </h1>

              {medicine.dosage && (
                <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                  Dosagem: {medicine.dosage}
                </p>
              )}

              {medicine.activeIngredient && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Princípio Ativo:</span>{' '}
                  {medicine.activeIngredient}
                </p>
              )}
            </div>

            {/* CTA Box */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center gap-3 shrink-0 md:w-64">
              <div className="text-xs text-slate-500 font-medium">Retirada Universitária</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">Gratuito</div>

              <Button
                asChild
                disabled={!isAvailable}
                className={`w-full rounded-xl font-bold py-6 gap-2 shadow-md ${
                  isAvailable
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/20'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400 pointer-events-none'
                }`}
              >
                <Link href={`/appointments/new?medicineId=${medicine.id}`}>
                  <Calendar className="w-5 h-5" />
                  Agendar Retirada
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Accessible Description Section (Important for Patients) */}
        <Card className="rounded-3xl border-slate-200 dark:border-slate-700 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <HeartPulse className="w-5 h-5 text-emerald-600" />
              Orientações ao Paciente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {medicine.accessibleDesc ? (
              <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-5 rounded-2xl text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
                {medicine.accessibleDesc}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">
                Nenhuma descrição adicional cadastrada para este medicamento.
              </p>
            )}

            <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl text-xs sm:text-sm text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
              <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
              <span>
                Para retirar medicamentos com receita controlada na Farmácia Escola, apresente a receita médica válida e documento com foto no momento do atendimento.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Batches / Stock Information */}
        <Card className="rounded-3xl border-slate-200 dark:border-slate-700 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <Layers className="w-5 h-5 text-teal-600" />
                Lotes em Estoque
              </CardTitle>
              {user?.role !== 'PACIENTE' && (
                <Button asChild size="sm" variant="outline" className="rounded-xl text-xs gap-1.5">
                  <Link href="/admin/stock">
                    Gerenciar Lotes
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {medicine.batches && medicine.batches.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {medicine.batches.map((batch) => {
                  const expDate = new Date(batch.expirationDate);
                  const isExpired = expDate.getTime() < Date.now();

                  return (
                    <div key={batch.id} className="py-3.5 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                            Lote: {batch.batchNumber}
                          </span>
                          {isExpired && (
                            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                              Vencido
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Validade: {expDate.toLocaleDateString('pt-BR')}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                          {batch.currentQuantity} unidades
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-sm">
                Nenhum lote ativo registrado no momento.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
