'use client';

// componentes e hooks do next e react
import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// componentes locais
import { AppShell } from '@/components/layout/app-shell';
import { CalendarModule } from '@/components/modules/calendar-module';
import { getModuleById } from '@/lib/constants';
import { ProtectedRoute } from '@/components/protected-route';

// conteudo da pagina de calendario. fica separado da rota principal
// porque usa usesearchparams, que exige estar dentro de um suspense
// boundary no next 13+. por isso o componente de rota envolve ele.
function CalendarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeModule = getModuleById('calendar');

  // resolve a aba ativa em cascata de prioridade:
  // 1) se veio ?tab=x na url, respeita
  // 2) senao usa a tab default definida no modulo
  // 3) senao cai pra 'agenda' como padrao seguro
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

  // troca de aba. atualiza a url (?tab=x) pra o estado ficar
  // compartilhavel (deep link) e o botao voltar funcionar.
  const handleTabChange = (tab: string) => {
    router.push('/calendar?tab=' + tab);
  };

  // se por algum motivo o modulo nao existir (id errado, por ex),
  // devolve null em vez de renderizar quebrado.
  if (!activeModule) {
    return null;
  }

  return (
    <ProtectedRoute routeKey="calendar">
      <AppShell activeModuleId="calendar" pageTitle="Calendário">
        <CalendarModule
          module={activeModule}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </AppShell>
    </ProtectedRoute>
  );
}

// rota principal do calendario. envolve o conteudo num suspense
// porque o componente interno usa usesearchparams.
export default function CalendarRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Carregando calendário...</div>}>
      <CalendarContent />
    </Suspense>
  );
}