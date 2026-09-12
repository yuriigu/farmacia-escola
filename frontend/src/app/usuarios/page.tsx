'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { AdminPage } from '@/components/pages/admin-page';
import { ProtectedRoute } from '@/components/protected-route';

function UsuariosContent() {
  return (
    <ProtectedRoute routeKey="usuarios">
      <AppShell activeModuleId="administracao" pageTitle="Usuários">
        <AdminPage />
      </AppShell>
    </ProtectedRoute>
  );
}

export default function UsuariosRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Carregando usuários...</div>}>
      <UsuariosContent />
    </Suspense>
  );
}
