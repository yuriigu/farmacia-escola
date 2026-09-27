'use client';

// imports de bibliotecas
import type { ReactNode } from 'react';

// imports locais
import type { ModuleTab, TabItem } from '@/types';

// props da barra de abas. aceita tanto moduletab quanto tabitem,
// porque cada tela pode definir as abas no formato que fizer mais
// sentido (o tabitem tem badge opcional, o moduletab nao).
interface TabBarProps {
  tabs: (ModuleTab | TabItem)[];
  activeTab: string;
  onTabChange: (_tabId: string) => void;
  className?: string;
}

// barra de abas horizontal, com scroll quando nao cabe na tela.
// usada por modulos que dividem o conteudo em mais de uma visao
// (ex: o modulo de calendario tem abas de agenda e agendamentos).
// com uma aba ou menos, o componente nao renderiza nada, porque
// uma barra de uma unica opcao nao agrega.
export function TabBar({ tabs, activeTab, onTabChange, className = '' }: TabBarProps) {
  // nao mostra nada com zero ou uma aba. evita a barra solitaria.
  if (tabs.length <= 1) {
    return null;
  }

  // container: linha com borda inferior e scroll horizontal (no-scrollbar
  // esconde a scrollbar mas mantem o scroll funcional).
  const containerClassName = 'flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 mb-6 overflow-x-auto no-scrollbar ' + className;

  return (
    <div className={containerClassName}>
      {tabs.map((tab) => {
        const Icon = tab.icon;

        // flag que indica se a aba atual e a ativa.
        let isActive = false;
        if (activeTab === tab.id) {
          isActive = true;
        } else {
          isActive = false;
        }

        // resolve o badge quando a aba suporta (so no tabitem).
        // o 'in' protege contra o moduletab, que nao tem esse campo.
        let badge: TabItem['badge'] = undefined;
        if ('badge' in tab) {
          badge = tab.badge;
        } else {
          badge = undefined;
        }

        // classes do botao da aba. o ativo ganha cor esmeralda,
        // borda inferior marcada e fundo suave; o inativo fica
        // neutro com hover.
        let buttonClasses = 'flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 -mb-px rounded-t-lg ';
        if (isActive) {
          buttonClasses = buttonClasses + 'border-emerald-600 text-emerald-700 dark:text-emerald-400 dark:border-emerald-400 font-semibold bg-emerald-50/40 dark:bg-emerald-950/20';
        } else {
          buttonClasses = buttonClasses + 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600';
        }

        // icone da aba, quando a aba define um. a cor segue o
        // estado (esmeralda no ativo, cinza no inativo).
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

        // cracha de contagem (ex: "5" do lado do nome). so aparece
        // quando a aba define um badge (mesmo que 0, a checagem
        // e !== undefined).
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
              // notifica o pai qual aba foi clicada. a troca real
              // (url, estado) fica com o consumidor.
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