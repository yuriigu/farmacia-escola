'use client';

import { LucideIcon } from 'lucide-react';
import type { ModuleTab } from '@/lib/constants';

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: number | string;
}

interface TabBarProps {
  tabs: (ModuleTab | TabItem)[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function TabBar({ tabs, activeTab, onTabChange, className = '' }: TabBarProps) {
  if (tabs.length <= 1) return null;

  return (
    <div
      className={`flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 mb-6 overflow-x-auto no-scrollbar ${className}`}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const badge = 'badge' in tab ? tab.badge : undefined;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 -mb-px rounded-t-lg ${
              isActive
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 dark:border-emerald-400 font-semibold bg-emerald-50/40 dark:bg-emerald-950/20'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            {Icon && <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />}
            <span>{tab.label}</span>
            {badge !== undefined && (
              <span
                className={`px-1.5 py-0.5 text-[11px] font-bold rounded-full ${
                  isActive
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}