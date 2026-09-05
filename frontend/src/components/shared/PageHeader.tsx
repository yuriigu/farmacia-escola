'use client';

// IMPORTS DO REACT
import { ReactNode } from 'react';

// IMPORTS DE BIBLIOTECAS
import { LucideIcon } from 'lucide-react';

// INTERFACE DAS PROPRIEDADES DO CABECALHO DA PAGINA
export interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

// COMPONENTE DE CABECALHO DA PAGINA
export function PageHeader({
  title,
  description,
  icon: Icon,
  badge,
  actions,
  className = '',
}: PageHeaderProps) {
  // RENDERIZANDO O ICONE DO CABECALHO
  let renderedIcon: ReactNode = null;
  if (Icon) {
    renderedIcon = (
      <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0 shadow-sm border border-emerald-100 dark:border-emerald-900/30">
        <Icon className="w-5 h-5" />
      </div>
    );
  }

  // RENDERIZANDO A DESCRICAO DO CABECALHO
  let renderedDescription: ReactNode = null;
  if (description) {
    renderedDescription = (
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
        {description}
      </p>
    );
  }

  // RENDERIZANDO AS ACOES DO CABECALHO
  let renderedActions: ReactNode = null;
  if (actions) {
    renderedActions = (
      <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
        {actions}
      </div>
    );
  }

  const containerClassName = 'flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-700/80 ' + className;

  return (
    <div className={containerClassName}>
      <div className="space-y-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          {renderedIcon}
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            {title}
          </h1>
          {badge}
        </div>
        {renderedDescription}
      </div>
      {renderedActions}
    </div>
  );
}