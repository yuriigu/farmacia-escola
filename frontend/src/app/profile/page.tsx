'use client';

import { AppShell } from '@/components/layout/app-shell';
import { SettingsPage } from '@/components/pages/settings-page';
import { ProtectedRoute } from '@/components/protected-route';

// rota de perfil do usuario. diferente das outras rotas de modulo,
// essa nao tem um suspense nem um content separado porque nao usa
// usesearchparams. e so uma pagina protegida envolvida pelo appshell.
// o componente interno e a settingspage, que cuida de exibir e
// atualizar os dados do proprio usuario.
export default function ProfilePage() {
  return (
    // protegida por rbac (routekey='profile'). quem nao tem acesso
    // cai no fluxo de bloqueio do protected-route.
    <ProtectedRoute routeKey="profile">
      <AppShell activeModuleId="profile" pageTitle="Meu Perfil">
        <SettingsPage />
      </AppShell>
    </ProtectedRoute>
  );
}