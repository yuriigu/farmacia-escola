'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { StockManagementPage } from '@/components/pages/StockManagementPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function EstoqueContent() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'FARMACEUTICO', 'ALUNO']}>
      <AppShell activeModuleId="estoque" pageTitle="Estoque de Lotes">
        <StockManagementPage />
      </AppShell>
    </ProtectedRoute>
  );
}

export default function EstoqueRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Carregando estoque de lotes...</div>}>
      <EstoqueContent />
    </Suspense>
  );
}