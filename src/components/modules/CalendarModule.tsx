'use client';

import { TabBar } from '@/components/shared/TabBar';
import type { ModuleConfig } from '@/lib/constants';
import { AppointmentsOverviewPage } from '@/components/pages/AppointmentsOverviewPage';
import { AppointmentsPage } from '@/components/pages/AppointmentsPage';
import { ScheduleSlotsPage } from '@/components/pages/ScheduleSlotsPage';
import { useAuthStore } from '@/lib/auth-store';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock } from 'lucide-react';

interface CalendarModuleProps {
  module: ModuleConfig;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function CalendarModule({ module, activeTab, onTabChange }: CalendarModuleProps) {
  const user = useAuthStore((s) => s.user);
  const isAdminOrFarm = user?.role === 'ADMIN' || user?.role === 'FARMACEUTICO';
  const [showSchedule, setShowSchedule] = useState(false);

  // Listen for calendar:goToAppointments to switch to agendamentos tab
  useEffect(() => {
    const handler = () => {
      setShowSchedule(false);
      onTabChange('agendamentos');
    };
    window.addEventListener('calendar:goToAppointments', handler);
    return () => window.removeEventListener('calendar:goToAppointments', handler);
  }, [onTabChange]);

  return (
    <div className="space-y-6 page-enter">
      <TabBar tabs={module.tabs} activeTab={activeTab} onTabChange={onTabChange} />
      {activeTab === 'agenda' && !showSchedule && <AppointmentsOverviewPage />}
      {activeTab === 'agenda' && showSchedule && <ScheduleSlotsPage />}
      {activeTab === 'agenda' && isAdminOrFarm && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setShowSchedule(!showSchedule)}
            className="rounded-xl gap-2"
          >
            {showSchedule ? (
              <><CalendarDays className="w-4 h-4" />Voltar para Agenda</>
            ) : (
              <><Clock className="w-4 h-4" />Gerenciar Escalas</>
            )}
          </Button>
        </div>
      )}
      {activeTab === 'agendamentos' && <AppointmentsPage />}
    </div>
  );
}
