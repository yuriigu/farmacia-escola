'use client';

// COMPONENTES E HOOKS DO NEXT E REACT
import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// COMPONENTES LOCAIS
import { AppShell } from '@/components/layout/AppShell';
import { CalendarModule } from '@/components/modules/CalendarModule';
import { getModuleById } from '@/lib/Constants';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// CONTEUDO DA PAGINA DE CALENDARIO
function CalendarioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeModule = getModuleById('calendario');

  // DETERMINANDO A ABA ATIVA DE FORMA VERBOSA
  const tabParam = searchParams.get('tab');
  let activeTab = 'agenda';
  if (tabParam) {
    activeTab = tabParam;
  } else if (activeModule) {
    if (activeModule.defaultTab) {
      activeTab = activeModule.defaultTab;
    } else {
      activeTab = 'agenda';
    }
  } else {
    activeTab = 'agenda';
  }

  // MANIPULADOR DE TROCA DE ABA
  const handleTabChange = (tab: string) => {
    router.push('/calendario?tab=' + tab);
  };

  // VERIFICANDO SE O MODULO EXISTE
  if (!activeModule) {
    return null;
  }

  return (
    <ProtectedRoute routeKey="calendario">
      <AppShell activeModuleId="calendario" pageTitle="Calendário">
        <CalendarModule
          module={activeModule}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </AppShell>
    </ProtectedRoute>
  );
}

// ROTA PRINCIPAL DO CALENDARIO
export default function CalendarioRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Carregando calendário...</div>}>
      <CalendarioContent />
    </Suspense>
  );
}
