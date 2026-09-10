'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { WithdrawalsPage } from '@/components/pages/withdrawals-page';
import { ProtectedRoute } from '@/components/protected-route';

function RetiradasContent() {
  return (
    <ProtectedRoute routeKey="retiradas">
      <AppShell activeModuleId="retiradas" pageTitle="Retiradas">
        <WithdrawalsPage />
      </AppShell>
    </ProtectedRoute>
  );
}

export default function RetiradasRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Carregando retiradas...</div>}>
      <RetiradasContent />
    </Suspense>
  );
}