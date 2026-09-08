'use client';

// IMPORTS DO REACT
import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';

// IMPORTS DE BIBLIOTECAS
import { CalendarDays, Clock } from 'lucide-react';

// IMPORTS LOCAIS
import { TabBar } from '@/components/shared/TabBar';
import type { ModuleConfig } from '@/lib/Constants';
import { AppointmentsOverviewPage } from '@/components/pages/AppointmentsOverviewPage';
import { AppointmentsPage } from '@/components/pages/AppointmentsPage';
import { ScheduleSlotsPage } from '@/components/pages/ScheduleSlotsPage';
import { useAuthStore } from '@/lib/AuthStore';
import { Button } from '@/components/ui/Button';

// INTERFACE DAS PROPRIEDADES DO MODULO DE CALENDARIO
interface CalendarModuleProps {
  module: ModuleConfig;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

// COMPONENTE DO MODULO DE CALENDARIO
export function CalendarModule({ module, activeTab, onTabChange }: CalendarModuleProps) {
  const user = useAuthStore((s) => {
    return s.user;
  });

  // VERIFICANDO SE O USUARIO E ADMIN OU FARMACEUTICO
  let isAdminOrFarm = false;
  if (user) {
    if (user.role === 'ADMIN') {
      isAdminOrFarm = true;
    } else if (user.role === 'FARMACEUTICO') {
      isAdminOrFarm = true;
    } else {
      isAdminOrFarm = false;
    }
  } else {
    isAdminOrFarm = false;
  }

  const [showSchedule, setShowSchedule] = useState(false);

  // ESCUTANDO EVENTO PARA IR PARA ABA DE AGENDAMENTOS
  useEffect(() => {
    const handler = () => {
      setShowSchedule(false);
      onTabChange('agendamentos');
    };
    window.addEventListener('calendar:goToAppointments', handler);
    return () => {
      window.removeEventListener('calendar:goToAppointments', handler);
    };
  }, [onTabChange]);

  // CONTEUDO PRINCIPAL DA ABA ATIVA
  let activeTabContent: ReactNode = null;
  if (activeTab === 'agenda') {
    if (!showSchedule) {
      activeTabContent = <AppointmentsOverviewPage />;
    } else {
      activeTabContent = <ScheduleSlotsPage />;
    }
  } else if (activeTab === 'agendamentos') {
    activeTabContent = <AppointmentsPage />;
  }

  // BOTAO DE GERENCIAR ESCALAS OU VOLTAR
  let scheduleToggleButton: ReactNode = null;
  if (activeTab === 'agenda') {
    if (isAdminOrFarm) {
      let buttonLabel: ReactNode = null;
      if (showSchedule) {
        buttonLabel = (
          <>
            <CalendarDays className="w-4 h-4" />
            Voltar para Agenda
          </>
        );
      } else {
        buttonLabel = (
          <>
            <Clock className="w-4 h-4" />
            Gerenciar Escalas
          </>
        );
      }

      scheduleToggleButton = (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => {
              if (showSchedule) {
                setShowSchedule(false);
              } else {
                setShowSchedule(true);
              }
            }}
            className="rounded-xl gap-2"
          >
            {buttonLabel}
          </Button>
        </div>
      );
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto page-enter">
      <TabBar tabs={module.tabs} activeTab={activeTab} onTabChange={onTabChange} />
      {activeTabContent}
      {scheduleToggleButton}
    </div>
  );
}
