'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { AppointmentsPage } from '@/components/pages/appointments-page';
import { ProtectedRoute } from '@/components/protected-route';

export default function AppointmentsRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500">Carregando agendamentos...</div>}>
      <ProtectedRoute routeKey="appointments">
        <AppShell activeModuleId="appointments" pageTitle="Agendamentos de Retirada">
          <AppointmentsPage />
        </AppShell>
      </ProtectedRoute>
    </Suspense>
  );
}
