'use client';

// COMPONENTES E HOOKS DO NEXT E REACT
import { Suspense } from 'react';
import { useRouter } from 'next/navigation';

// COMPONENTES LOCAIS
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/components/pages/DashboardPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// CONTEUDO DA PAGINA DO DASHBOARD
function DashboardContent() {
  const router = useRouter();

  return (
    <ProtectedRoute routeKey="dashboard">
      <AppShell activeModuleId="dashboard" pageTitle="Dashboard">
        <DashboardPage
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

// ROTA PRINCIPAL DO DASHBOARD
export default function DashboardRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Carregando dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
