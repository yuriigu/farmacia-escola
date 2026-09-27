'use client';

// componentes e hooks do next e react
import { Suspense } from 'react';
import { useRouter } from 'next/navigation';

// componentes locais
import { AppShell } from '@/components/layout/app-shell';
import { DashboardPage } from '@/components/pages/dashboard-page';
import { ProtectedRoute } from '@/components/protected-route';

// conteudo da pagina do dashboard. fica separado da rota principal
// pra padronizar com as outras telas (suspense + conteudo), mesmo que
// aqui o componente interno nao use usesearchparams.
function DashboardContent() {
  const router = useRouter();

  return (
    <ProtectedRoute routeKey="dashboard">
      <AppShell activeModuleId="dashboard" pageTitle="Dashboard">
        <DashboardPage
          // navegacao disparada pelos cards do dashboard. recebe o
          // modulo alvo e, se veio, a aba. monta a url e empurra pro
          // historico. quando nao tem aba, manda so /modulo.
          onNavigate={(mod, tab) => {
            let queryString = '';
            if (tab) {
              queryString = '?tab=' + tab;
            } else {
              queryString = '';
            }
            router.push('/' + mod + queryString);
          }}
        />
      </AppShell>
    </ProtectedRoute>
  );
}

// rota principal do dashboard. envolve o conteudo num suspense pra
// manter o mesmo padrao das outras rotas e ter um fallback de loading.
export default function DashboardRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Carregando dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}