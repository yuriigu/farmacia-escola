'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { AdminPage } from '@/components/pages/admin-page';
import { ProtectedRoute } from '@/components/protected-route';

function AdministracaoContent() {
  return (
    <ProtectedRoute routeKey="administracao">
      <AppShell activeModuleId="administracao" pageTitle="Administração">
        <AdminPage />
      </AppShell>
    </ProtectedRoute>
  );
}

export default function AdministracaoRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Carregando administração...</div>}>
      <AdministracaoContent />
    </Suspense>
  );
}