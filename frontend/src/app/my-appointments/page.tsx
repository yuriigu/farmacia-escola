'use client';

import { AppShell } from '@/components/layout/app-shell';
import { AppointmentsPage } from '@/components/pages/appointments-page';
import { ProtectedRoute } from '@/components/protected-route';

export default function MyAppointmentsPage() {
  return (
    <ProtectedRoute allowedRoles={['PACIENTE']} routeKey="my-appointments">
      <AppShell activeModuleId="my-appointments" pageTitle="Meus Agendamentos">
        <AppointmentsPage />
      </AppShell>
    </ProtectedRoute>
  );
}