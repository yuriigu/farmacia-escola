'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { SettingsPage } from '@/components/pages/settings-page';
import { ProtectedRoute } from '@/components/protected-route';

function ConfiguracoesContent() {
  return (
    <ProtectedRoute routeKey="profile">
      <AppShell activeModuleId="configuracoes" pageTitle="Meu Perfil">
        <SettingsPage />
      </AppShell>
    </ProtectedRoute>
  );
}

export default function ConfiguracoesRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Carregando configurações...</div>}>
      <ConfiguracoesContent />
    </Suspense>
  );
}