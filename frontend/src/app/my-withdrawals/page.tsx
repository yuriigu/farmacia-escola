'use client';

import { AppShell } from '@/components/layout/AppShell';
import { WithdrawalsPage } from '@/components/pages/WithdrawalsPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function MyWithdrawalsPage() {
  return (
    <ProtectedRoute allowedRoles={['PACIENTE']} routeKey="my-withdrawals">
      <AppShell activeModuleId="my-withdrawals" pageTitle="Minhas Retiradas">
        <WithdrawalsPage />
      </AppShell>
    </ProtectedRoute>
  );
}