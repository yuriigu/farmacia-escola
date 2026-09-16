'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { AdminPage } from '@/components/pages/admin-page';
import { ProtectedRoute } from '@/components/protected-route';

function UsersContent() {
  return (
    <ProtectedRoute routeKey="users">
      <AppShell activeModuleId="users" pageTitle="Usuários">
        <AdminPage />
      </AppShell>
    </ProtectedRoute>
  );
}

export default function UsersRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Carregando usuários...</div>}>
      <UsersContent />
    </Suspense>
  );
}
