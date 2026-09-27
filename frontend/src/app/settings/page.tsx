'use client';

import { AppShell } from '@/components/layout/app-shell';
import { SettingsPage } from '@/components/pages/settings-page';
import { ProtectedRoute } from '@/components/protected-route';

// rota de configuracoes do sistema. assim como a rota de perfil,
// nao tem suspense nem content separado, porque nao usa
// usesearchparams. e so uma pagina protegida envolvida pelo appshell.
export default function SettingsRoute() {
  return (
    // protegida por rbac (routekey='settings'). na pratica, o acesso
    // costuma ser restrito a admin, mas a checagem fica no
    // protected-route, nao aqui na rota.
    <ProtectedRoute routeKey="settings">
      <AppShell activeModuleId="settings" pageTitle="Configurações do Sistema">
        <SettingsPage />
      </AppShell>
    </ProtectedRoute>
  );
}