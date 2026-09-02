'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { DisposalsPage } from '@/components/pages/DisposalsPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function DescartesContent() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'FARMACEUTICO', 'ALUNO']}>
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