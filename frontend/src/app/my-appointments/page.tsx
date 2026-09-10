'use client';

import { AppShell } from '@/components/layout/AppShell';
import { AppointmentsPage } from '@/components/pages/AppointmentsPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function MyAppointmentsPage() {
  return (
    <ProtectedRoute allowedRoles={['PACIENTE']} routeKey="my-appointments">
      <AppShell activeModuleId="my-appointments" pageTitle="Meus Agendamentos">
        <AppointmentsPage />
      </AppShell>
    </ProtectedRoute>
  );
}