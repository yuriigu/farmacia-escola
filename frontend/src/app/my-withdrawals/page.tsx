'use client';

import { AppShell } from '@/components/layout/app-shell';
import { WithdrawalsPage } from '@/components/pages/withdrawals-page';
import { ProtectedRoute } from '@/components/protected-route';

export default function MyWithdrawalsPage() {
  return (
    <ProtectedRoute allowedRoles={['PACIENTE']} routeKey="my-withdrawals">
      <AppShell activeModuleId="my-withdrawals" pageTitle="Minhas Retiradas">
        <WithdrawalsPage />
      </AppShell>
    </ProtectedRoute>
  );
}