'use client';

import { useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { SettingsPage } from '@/components/pages/settings-page';
import { ProtectedRoute } from '@/components/protected-route';

export default function ProfilePage() {
  return (
    <ProtectedRoute routeKey="profile">
      <AppShell activeModuleId="configuracoes" pageTitle="Meu Perfil">
        <SettingsPage mode="profile" />
      </AppShell>
    </ProtectedRoute>
  );
}