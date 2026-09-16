'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { StockManagementPage } from '@/components/pages/stock-management-page';
import { ProtectedRoute } from '@/components/protected-route';

function InventoryContent() {
  return (
    <ProtectedRoute routeKey="inventory">
      <AppShell activeModuleId="inventory" pageTitle="Estoque de Lotes">
        <StockManagementPage />
      </AppShell>
    </ProtectedRoute>
  );
}

export default function InventoryRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Carregando estoque de lotes...</div>}>
      <InventoryContent />
    </Suspense>
  );
}
