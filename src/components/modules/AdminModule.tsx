'use client';

import { TabBar } from '@/components/shared/TabBar';
import type { ModuleConfig } from '@/lib/constants';
import { PatientsPage } from '@/components/pages/PatientsPage';
import { AdminPage } from '@/components/pages/AdminPage';

interface AdminModuleProps {
  module: ModuleConfig;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AdminModule({ module, activeTab, onTabChange }: AdminModuleProps) {
  return (
    <div className="space-y-6 page-enter">
      <TabBar tabs={module.tabs} activeTab={activeTab} onTabChange={onTabChange} />
      {activeTab === 'pacientes' && <PatientsPage />}
      {activeTab === 'usuarios' && <AdminPage />}
    </div>
  );
}
