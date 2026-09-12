'use client';

import { AppShell } from '@/components/layout/app-shell';
import { SettingsPage } from '@/components/pages/settings-page';
import { ProtectedRoute } from '@/components/protected-route';

export default function SettingsRoute() {
  return (
    <ProtectedRoute routeKey="settings">
      <AppShell activeModuleId="settings" pageTitle="Configurações do Sistema">
        <SettingsPage />
      </AppShell>
    </ProtectedRoute>
  );
}