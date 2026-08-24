'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { InventoryModule } from '@/components/modules/InventoryModule';
import { getModuleById } from '@/lib/constants';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function EstoqueContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeModule = getModuleById('estoque');
  const activeTab = searchParams.get('tab') || activeModule?.defaultTab || 'medicamentos';

  const handleTabChange = (tab: string) => {
    router.push(`/estoque?tab=${tab}`);
  };

  if (!activeModule) return null;

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'FARMACEUTICO', 'ALUNO']}>
      <AppShell activeModuleId="estoque" pageTitle="Estoque">
        <InventoryModule
          module={activeModule}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </AppShell>
    </ProtectedRoute>
  );
}

export default function EstoqueRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Carregando estoque...</div>}>
      <EstoqueContent />
    </Suspense>
  );
}
