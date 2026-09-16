'use client';

import { AppShell } from '@/components/layout/app-shell';
import { SettingsPage } from '@/components/pages/settings-page';
import { ProtectedRoute } from '@/components/protected-route';

export default function ProfilePage() {
  return (
    <ProtectedRoute routeKey="profile">
      <AppShell activeModuleId="profile" pageTitle="Meu Perfil">
        <SettingsPage />
      </AppShell>
    </ProtectedRoute>
  );
}