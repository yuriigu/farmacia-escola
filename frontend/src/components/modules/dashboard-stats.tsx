'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Pill, Users, AlertTriangle, Calendar } from 'lucide-react';

interface StatsProps {
  totalMedicines: number;
  totalPatients: number;
  lowStockCount: number;
  pendingAppointments: number;
}

export function DashboardStats({
  totalMedicines,
  totalPatients,
  lowStockCount,
  pendingAppointments,
}: StatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="dashboard-stats">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-slate-500">Medicamentos</CardTitle>
          <Pill className="w-4 h-4 text-emerald-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100" data-testid="stat-medicines">
            {totalMedicines}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-slate-500">Pacientes</CardTitle>
          <Users className="w-4 h-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100" data-testid="stat-patients">
            {totalPatients}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-slate-500">Estoque Crítico</CardTitle>
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100" data-testid="stat-low-stock">
            {lowStockCount}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-slate-500">Agendamentos Pendentes</CardTitle>
          <Calendar className="w-4 h-4 text-indigo-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100" data-testid="stat-appointments">
            {pendingAppointments}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
