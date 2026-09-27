'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { DisposalsPage } from '@/components/pages/disposals-page';
import { ProtectedRoute } from '@/components/protected-route';

// conteudo da pagina de descartes. separado da rota principal pra
// manter o padrao das outras telas (suspense + conteudo), e pra
// deixar a rota so com a responsabilidade de montar o boundary.
function DisposalsContent() {
  return (
    // protegida por rbac (routekey='disposals'). quem nao tem acesso
    // cai no fluxo de bloqueio do protected-route.
    <ProtectedRoute routeKey="disposals">
      <AppShell activeModuleId="disposals" pageTitle="Descartes">
        <DisposalsPage />
      </AppShell>
    </ProtectedRoute>
  );
}

// rota principal de descartes. envolve o conteudo num suspense pra
// ter um fallback de loading enquanto a pagina carrega.
export default function DisposalsRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Carregando descartes...</div>}>
      <DisposalsContent />
    </Suspense>
  );
}