'use client';

// COMPONENTES E HOOKS DO NEXT E REACT
import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// COMPONENTES LOCAIS
import { AppShell } from '@/components/layout/AppShell';
import { CalendarModule } from '@/components/modules/CalendarModule';
import { getModuleById } from '@/lib/Constants';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// CONTEUDO DA PAGINA DE AGENDAMENTOS
function AgendamentosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeModule = getModuleById('calendario');

  // DETERMINANDO A ABA ATIVA
  const tabParam = searchParams.get('tab');
  let activeTab = 'agendamentos';
  if (tabParam) {
    activeTab = tabParam;
  } else {
    activeTab = 'agendamentos';
  }

  // MANIPULADOR DE TROCA DE ABA
  const handleTabChange = (tab: string) => {
    router.push('/agendamentos?tab=' + tab);
  };

  // VERIFICANDO SE O MODULO EXISTE
  if (!activeModule) {
    return null;
  }

  return (
    <ProtectedRoute routeKey="agendamentos">
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

// ROTA PRINCIPAL DE AGENDAMENTOS
export default function AgendamentosRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Carregando agendamentos...</div>}>
      <AgendamentosContent />
    </Suspense>
  );
}
