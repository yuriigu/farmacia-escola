'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { ProtectedRoute } from '@/components/protected-route';
import { ScheduleSlotsPage } from '@/components/pages/schedule-slots-page';

function ScalesContent() {
  return (
    <ProtectedRoute routeKey="scales">
      <AppShell activeModuleId="scales" pageTitle="Escala">
        <ScheduleSlotsPage />
      </AppShell>
    </ProtectedRoute>
  );
}

export default function ScalesRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Carregando escala...</div>}>
      <ScalesContent />
    </Suspense>
  );
}