'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { CalendarModule } from '@/components/modules/CalendarModule';
import { getModuleById } from '@/lib/constants';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function AgendamentosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeModule = getModuleById('calendario');
  const activeTab = searchParams.get('tab') || 'agendamentos';

  const handleTabChange = (tab: string) => {
    router.push(`/agendamentos?tab=${tab}`);
  };

  if (!activeModule) return null;

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'FARMACEUTICO', 'MEDICO']}>
      <AppShell activeModuleId="calendario" pageTitle="Agendamentos">
        <CalendarModule
          module={activeModule}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </AppShell>
    </ProtectedRoute>
  );
}

export default function AgendamentosRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Carregando agendamentos...</div>}>
      <AgendamentosContent />
    </Suspense>
  );
}
