'use client';

// imports do react
import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';

// imports locais
import { TabBar } from '@/components/shared/tab-bar';
import type { ModuleConfig } from '@/types';
import { AppointmentsOverviewPage } from '@/components/pages/appointments-overview-page';
import { AppointmentsPage } from '@/components/pages/appointments-page';
import { ScheduleSlotsPage } from '@/components/pages/schedule-slots-page';

// interface das propriedades do modulo de calendario.
interface CalendarModuleProps {
  module: ModuleConfig;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

// componente do modulo de calendario. ele organiza duas abas
// principais (agenda e agendamentos) e, dentro da aba agenda,
// alterna entre a visao geral e a escala conforme um estado interno.
export function CalendarModule({ module, activeTab, onTabChange }: CalendarModuleProps) {
  // controla se, dentro da aba 'agenda', estamos mostrando a escala
  // (trueschedule) ou a visao geral (false).
  const [showSchedule, setShowSchedule] = useState(false);

  // escuta um evento customizado disparado por outros pontos da tela
  // (ex: algum botao dentro do overview). quando chega, a gente sai
  // da escala interna e troca pra aba 'agendamentos'.
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

  // conteudo da aba ativa. o agendamento de conteudo respeita a aba
  // selecionada e, na aba 'agenda', a flag showSchedule.
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto page-enter">
      {/* tabbar com as abas definidas no modulo. cada clique chama
          ontabchange, que propaga pro componente pai (que atualiza
          a url via ?tab=x). */}
      <TabBar tabs={module.tabs} activeTab={activeTab} onTabChange={onTabChange} />
      {activeTabContent}
    </div>
  );
}