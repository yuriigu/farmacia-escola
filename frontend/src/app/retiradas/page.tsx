'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { WithdrawalsPage } from '@/components/pages/WithdrawalsPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function RetiradasContent() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'FARMACEUTICO', 'MEDICO', 'ALUNO']}>
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