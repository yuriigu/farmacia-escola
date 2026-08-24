'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PatientsPage } from '@/components/pages/PatientsPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function PacientesContent() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'FARMACEUTICO']}>
      <AppShell activeModuleId="administracao" pageTitle="Pacientes">
        <div className="space-y-6 page-enter">
          <PatientsPage />
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

export default function PacientesRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Carregando pacientes...</div>}>
      <PacientesContent />
    </Suspense>
  );
}
