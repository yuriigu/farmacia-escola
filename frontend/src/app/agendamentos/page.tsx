'use client';

// COMPONENTES E HOOKS DO NEXT E REACT
import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// COMPONENTES LOCAIS
import { AppShell } from '@/components/layout/app-shell';
import { CalendarModule } from '@/components/modules/calendar-module';
import { getModuleById } from '@/lib/constants';
import { ProtectedRoute } from '@/components/protected-route';

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
