'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { AdminModule } from '@/components/modules/AdminModule';
import { getModuleById } from '@/lib/constants';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function AdministracaoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeModule = getModuleById('administracao');
  const activeTab = searchParams.get('tab') || activeModule?.defaultTab || 'pacientes';

  const handleTabChange = (tab: string) => {
    router.push(`/administracao?tab=${tab}`);
  };

  if (!activeModule) return null;

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <AppShell activeModuleId="administracao" pageTitle="Administração">
        <AdminModule
          module={activeModule}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
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
