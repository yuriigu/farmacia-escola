'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/components/pages/DashboardPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function DashboardContent() {
  const router = useRouter();

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'FARMACEUTICO', 'MEDICO', 'ALUNO', 'PACIENTE']}>
      <AppShell activeModuleId="dashboard" pageTitle="Dashboard">
        <DashboardPage
          onNavigate={(mod, tab) => {
            const queryString = tab ? `?tab=${tab}` : '';
            router.push(`/${mod}${queryString}`);
          }}
        />
      </AppShell>
    </ProtectedRoute>
  );
}

export default function DashboardRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Carregando dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
