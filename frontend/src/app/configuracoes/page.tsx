'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SettingsPage } from '@/components/pages/SettingsPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function ConfiguracoesContent() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'FARMACEUTICO', 'MEDICO', 'ALUNO', 'PACIENTE']}>
      <AppShell activeModuleId="configuracoes" pageTitle="Configurações & Perfil">
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