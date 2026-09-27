'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { ProtectedRoute } from '@/components/protected-route';
import { ScheduleSlotsPage } from '@/components/pages/schedule-slots-page';

// conteudo da pagina de escala (slots de agenda). separado da rota
// principal pra manter o padrao das outras telas (suspense + conteudo).
function ScalesContent() {
  return (
    // protegida por rbac (routekey='scales'). quem nao tem acesso
    // cai no fluxo de bloqueio do protected-route.
    <ProtectedRoute routeKey="scales">
      <AppShell activeModuleId="scales" pageTitle="Escala">
        <ScheduleSlotsPage />
      </AppShell>
    </ProtectedRoute>
  );
}

// rota principal de escala. envolve o conteudo num suspense pra ter
// um fallback de loading enquanto a pagina carrega.
export default function ScalesRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Carregando escala...</div>}>
      <ScalesContent />
    </Suspense>
  );
}