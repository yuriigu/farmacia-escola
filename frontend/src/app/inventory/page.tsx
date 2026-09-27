'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { StockManagementPage } from '@/components/pages/stock-management-page';
import { ProtectedRoute } from '@/components/protected-route';

// conteudo da pagina de estoque de lotes. separado da rota principal
// pra manter o padrao das outras telas (suspense + conteudo).
function InventoryContent() {
  return (
    // protegida por rbac (routekey='inventory'). quem nao tem acesso
    // cai no fluxo de bloqueio do protected-route.
    <ProtectedRoute routeKey="inventory">
      <AppShell activeModuleId="inventory" pageTitle="Estoque de Lotes">
        <StockManagementPage />
      </AppShell>
    </ProtectedRoute>
  );
}

// rota principal do estoque de lotes. envolve o conteudo num suspense
// pra ter um fallback de loading enquanto a pagina carrega.
export default function InventoryRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Carregando estoque de lotes...</div>}>
      <InventoryContent />
    </Suspense>
  );
}