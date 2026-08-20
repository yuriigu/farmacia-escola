'use client';

import { TabBar } from '@/components/shared/TabBar';
import type { ModuleConfig } from '@/lib/constants';
import { InventoryPage } from '@/components/pages/InventoryPage';
import { StockManagementPage } from '@/components/pages/StockManagementPage';
import { WithdrawalsPage } from '@/components/pages/WithdrawalsPage';
import { DisposalsPage } from '@/components/pages/DisposalsPage';

interface InventoryModuleProps {
  module: ModuleConfig;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function InventoryModule({ module, activeTab, onTabChange }: InventoryModuleProps) {
  return (
    <div className="space-y-6 page-enter">
      <TabBar tabs={module.tabs} activeTab={activeTab} onTabChange={onTabChange} />
      {activeTab === 'medicamentos' && <InventoryPage />}
      {activeTab === 'lotes' && <StockManagementPage />}
      {activeTab === 'retiradas' && <WithdrawalsPage />}
      {activeTab === 'descartes' && <DisposalsPage />}
    </div>
  );
}
