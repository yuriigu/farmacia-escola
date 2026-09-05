'use client';

// IMPORTS DE BIBLIOTECAS
import { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

// IMPORTS LOCAIS
import type { ModuleTab } from '@/lib/Constants';

// INTERFACE DO ITEM DE ABA
export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: number | string;
}

// INTERFACE DAS PROPRIEDADES DA BARRA DE ABAS
interface TabBarProps {
  tabs: (ModuleTab | TabItem)[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

// COMPONENTE DA BARRA DE ABAS
export function TabBar({ tabs, activeTab, onTabChange, className = '' }: TabBarProps) {
  if (tabs.length <= 1) {
    return null;
  }

  const containerClassName = 'flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 mb-6 overflow-x-auto no-scrollbar ' + className;

  return (
    <div className={containerClassName}>
      {tabs.map((tab) => {
        const Icon = tab.icon;

        let isActive = false;
        if (activeTab === tab.id) {
          isActive = true;
        } else {
          isActive = false;
        }

        let badge: TabItem['badge'] = undefined;
        if ('badge' in tab) {
          badge = tab.badge;
        } else {
          badge = undefined;
        }

        // CLASSES DO BOTAO DA ABA
        let buttonClasses = 'flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 -mb-px rounded-t-lg ';
        if (isActive) {
          buttonClasses = buttonClasses + 'border-emerald-600 text-emerald-700 dark:text-emerald-400 dark:border-emerald-400 font-semibold bg-emerald-50/40 dark:bg-emerald-950/20';
        } else {
          buttonClasses = buttonClasses + 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600';
        }

        // ICONE DA ABA
        let renderedIcon: ReactNode = null;
        if (Icon) {
          let iconColor = 'text-slate-400';
          if (isActive) {
            iconColor = 'text-emerald-600 dark:text-emerald-400';
          } else {
            iconColor = 'text-slate-400';
          }
          const iconClassName = 'w-4 h-4 ' + iconColor;
          renderedIcon = <Icon className={iconClassName} />;
        }

        // CRACHA DA ABA
        let renderedBadge: ReactNode = null;
        if (badge !== undefined) {
          let badgeColor = 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
          if (isActive) {
            badgeColor = 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200';
          } else {
            badgeColor = 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
          }
          const badgeClassName = 'px-1.5 py-0.5 text-[11px] font-bold rounded-full ' + badgeColor;
          renderedBadge = (
            <span className={badgeClassName}>
              {badge}
            </span>
          );
        }

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              onTabChange(tab.id);
            }}
            className={buttonClasses}
          >
            {renderedIcon}
            <span>{tab.label}</span>
            {renderedBadge}
          </button>
        );
      })}
    </div>
  );
}