'use client';

// IMPORTS DO NEXT E REACT
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// IMPORTS DE BIBLIOTECAS
import {
  ArrowLeft, Calendar, AlertCircle,
  ShieldCheck, HeartPulse, Layers
} from 'lucide-react';

// IMPORTS LOCAIS
import { AppShell } from '@/components/layout/AppShell';
import { useMedicine } from '@/services/Queries';
import { useAuthStore } from '@/lib/AuthStore';
import { MEDICINE_CATEGORY_LABELS, MEDICINE_CATEGORY_COLORS } from '@/lib/Constants';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

// COMPONENTE DA PAGINA DE DETALHES DO MEDICAMENTO
export default function MedicineDetailsPage() {
  const params = useParams();
  const router = useRouter();

  // OBTENDO O ID DOS PARAMETROS DE FORMA SEGURA
  let rawId = 0;
  if (params) {
    if (params.id) {
      rawId = Number(params.id);
    } else {
      rawId = 0;
    }
  } else {
    rawId = 0;
  }
  const id = rawId;

  const user = useAuthStore((s) => {
    return s.user;
  });

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

  // TRATANDO ERRO OU MEDICAMENTO AUSENTE
  if (isError) {
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

  if (!medicine) {
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

  // DETERMINANDO SE ESTA DISPONIVEL
  let totalQty = 0;
  if (medicine.totalQuantity !== null && medicine.totalQuantity !== undefined) {
    totalQty = medicine.totalQuantity;
  } else {
    totalQty = 0;
  }
  let isAvailable = false;
  if (totalQty > 0) {
    isAvailable = true;
  } else {
    isAvailable = false;
  }

  // DETERMINANDO CATEGORIA E ROTULOS
  let rawCategory = 'outro';
  if (medicine.category) {
    rawCategory = medicine.category;
  } else {
    rawCategory = 'outro';
  }
  const catKey = rawCategory.toLowerCase();

  let categoryLabel = 'Geral';
  if (MEDICINE_CATEGORY_LABELS[catKey]) {
    categoryLabel = MEDICINE_CATEGORY_LABELS[catKey];
  } else if (medicine.category) {
    categoryLabel = medicine.category;
  } else {
    categoryLabel = 'Geral';
  }

  let categoryColor = 'bg-slate-100 text-slate-600';
  if (MEDICINE_CATEGORY_COLORS[catKey]) {
    categoryColor = MEDICINE_CATEGORY_COLORS[catKey];
  } else {
    categoryColor = 'bg-slate-100 text-slate-600';
  }

  // DETERMINANDO CRACHA DE DISPONIBILIDADE
  let availabilityBadgeClass = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 font-bold';
  let availabilityText = 'Em falta no momento';
  if (isAvailable) {
    availabilityBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold';
    availabilityText = 'Disponível (' + medicine.totalQuantity + ' un)';
  } else {
    availabilityBadgeClass = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 font-bold';
    availabilityText = 'Em falta no momento';
  }

  // DETERMINANDO ELEMENTO DE DOSAGEM
  let dosageElement = null;
  if (medicine.dosage) {
    dosageElement = (
      <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
        Dosagem: {medicine.dosage}
      </p>
    );
  }

  // DETERMINANDO ELEMENTO DE PRINCIPIO ATIVO
  let activeIngredientElement = null;
  if (medicine.activeIngredient) {
    activeIngredientElement = (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        <span className="font-semibold text-slate-700 dark:text-slate-300">Princípio Ativo:</span>{' '}
        {medicine.activeIngredient}
      </p>
    );
  }

  // DETERMINANDO BOTAO DE AGENDAMENTO
  let ctaButtonClass = 'w-full rounded-xl font-bold py-6 gap-2 shadow-md ';
  if (isAvailable) {
    ctaButtonClass = ctaButtonClass + 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/20';
  } else {
    ctaButtonClass = ctaButtonClass + 'bg-slate-200 dark:bg-slate-700 text-slate-400 pointer-events-none';
  }

  // DETERMINANDO DESCRICAO ACESSIVEL
  let accessibleDescElement = null;
  if (medicine.accessibleDesc) {
    accessibleDescElement = (
      <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-5 rounded-2xl text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
        {medicine.accessibleDesc}
      </div>
    );
  } else {
    accessibleDescElement = (
      <p className="text-sm text-slate-400 italic">
        Nenhuma descrição adicional cadastrada para este medicamento.
      </p>
    );
  }

  // DETERMINANDO BOTAO DE GERENCIAR LOTES
  let manageBatchesButton = null;
  if (user) {
    if (user.role !== 'PACIENTE') {
      manageBatchesButton = (
        <Button asChild size="sm" variant="outline" className="rounded-xl text-xs gap-1.5">
          <Link href="/admin/stock">
            Gerenciar Lotes
          </Link>
        </Button>
      );
    }
  }

  // DETERMINANDO CONTEUDO DOS LOTES
  let batchesContent = null;
  if (medicine.batches) {
    if (medicine.batches.length > 0) {
      batchesContent = (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
          {medicine.batches.map((batch) => {
            const expDate = new Date(batch.expirationDate);
            let isExpired = false;
            if (expDate.getTime() < Date.now()) {
              isExpired = true;
            } else {
              isExpired = false;
            }

            let expiredBadge = null;
            if (isExpired) {
              expiredBadge = (
                <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                  Vencido
                </Badge>
              );
            }

            return (
              <div key={batch.id} className="py-3.5 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                      Lote: {batch.batchNumber}
                    </span>
                    {expiredBadge}
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
      );
    } else {
      batchesContent = (
        <div className="py-6 text-center text-slate-400 text-sm">
          Nenhum lote ativo registrado no momento.
        </div>
      );
    }
  } else {
    batchesContent = (
      <div className="py-6 text-center text-slate-400 text-sm">
        Nenhum lote ativo registrado no momento.
      </div>
    );
  }

  const categorySpanClass = 'inline-block px-3 py-1 rounded-lg text-xs font-bold ' + categoryColor;

  return (
    <AppShell activeModuleId={'medicines' as any} pageTitle={'Medicamento: ' + medicine.name}>
      <div className="max-w-4xl mx-auto space-y-6 page-enter">
        {/* Navigation Breadcrumb */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              router.push('/medicines');
            }}
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
                <span className={categorySpanClass}>
                  {categoryLabel}
                </span>
                <Badge
                  variant="outline"
                  className={availabilityBadgeClass}
                >
                  {availabilityText}
                </Badge>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                {medicine.name}
              </h1>

              {dosageElement}
              {activeIngredientElement}
            </div>

            {/* CTA Box */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center gap-3 shrink-0 md:w-64">
              <div className="text-xs text-slate-500 font-medium">Retirada Universitária</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">Gratuito</div>

              <Button
                asChild
                disabled={!isAvailable}
                className={ctaButtonClass}
              >
                <Link href={'/appointments/new?medicineId=' + medicine.id}>
                  <Calendar className="w-5 h-5" />
                  Agendar Retirada
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Accessible Description Section */}
        <Card className="rounded-3xl border-slate-200 dark:border-slate-700 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <HeartPulse className="w-5 h-5 text-emerald-600" />
              Orientações ao Paciente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {accessibleDescElement}

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
              {manageBatchesButton}
            </div>
          </CardHeader>
          <CardContent>
            {batchesContent}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
