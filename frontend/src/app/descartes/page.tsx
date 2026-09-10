'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { DisposalsPage } from '@/components/pages/disposals-page';
import { ProtectedRoute } from '@/components/protected-route';

function DescartesContent() {
  return (
    <ProtectedRoute routeKey="descartes">
      <AppShell activeModuleId="descartes" pageTitle="Descartes">
        <DisposalsPage />
      </AppShell>
    </ProtectedRoute>
  );
}

export default function DescartesRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Carregando descartes...</div>}>
      <DescartesContent />
    </Suspense>
  );
}