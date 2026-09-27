'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { AdminPage } from '@/components/pages/admin-page';
import { ProtectedRoute } from '@/components/protected-route';

// conteudo da pagina de gestao de usuarios. separado da rota principal
// pra manter o padrao das outras telas (suspense + conteudo).
function UsersContent() {
  return (
    // protegida por rbac (routekey='users'). na pratica, e uma area
    // administrativa: so admin costuma ter acesso. a checagem fica
    // no protected-route, nao aqui.
    <ProtectedRoute routeKey="users">
      <AppShell activeModuleId="users" pageTitle="Usuários">
        <AdminPage />
      </AppShell>
    </ProtectedRoute>
  );
}

// rota principal de gestao de usuarios. envolve o conteudo num
// suspense pra ter um fallback de loading enquanto a pagina carrega.
export default function UsersRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Carregando usuários...</div>}>
      <UsersContent />
    </Suspense>
  );
}