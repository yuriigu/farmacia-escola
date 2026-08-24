'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProfilePage } from '@/components/pages/ProfilePage';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function ProfileContent() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'FARMACEUTICO', 'MEDICO', 'ALUNO', 'PACIENTE']}>
      <AppShell activeModuleId="profile" pageTitle="Meu Perfil">
        <ProfilePage />
      </AppShell>
    </ProtectedRoute>
  );
}

export default function ProfileRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Carregando perfil...</div>}>
      <ProfileContent />
    </Suspense>
  );
}
