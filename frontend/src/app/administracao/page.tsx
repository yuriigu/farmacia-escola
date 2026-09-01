'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AdminPage } from '@/components/pages/AdminPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function AdministracaoContent() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
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