'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { DisposalsPage } from '@/components/pages/disposals-page';
import { ProtectedRoute } from '@/components/protected-route';

function DisposalsContent() {
  return (
    <ProtectedRoute routeKey="disposals">
      <AppShell activeModuleId="disposals" pageTitle="Descartes">
        <DisposalsPage />
      </AppShell>
    </ProtectedRoute>
  );
}

export default function DisposalsRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Carregando descartes...</div>}>
      <DisposalsContent />
    </Suspense>
  );
}
