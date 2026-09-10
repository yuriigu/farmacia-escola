'use client';

import { AppShell } from '@/components/layout/AppShell';
import { SettingsPage } from '@/components/pages/SettingsPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function SettingsRoute() {
  return (
    <ProtectedRoute routeKey="settings">
      <AppShell activeModuleId="settings" pageTitle="Configurações do Sistema">
        <SettingsPage mode="system" />
      </AppShell>
    </ProtectedRoute>
  );
}