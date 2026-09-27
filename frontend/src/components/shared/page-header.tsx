'use client';

// imports do react
import { ReactNode } from 'react';

// imports de bibliotecas
import type { PageHeaderProps } from '@/types';

// cabecalho padrao das paginas do sistema. mostra titulo (com icone
// e badge opcional), descricao e uma area de acoes a direita.
// mantem o mesmo visual em todas as telas, evitando cabecalhos
// soltos espalhados pelo projeto.
export function PageHeader({
  title,
  description,
  icon: Icon,
  badge,
  actions,
  className = '',
}: PageHeaderProps) {
  // icone do cabecalho, em caixinha esmeralda. so aparece quando
  // o icone foi passado.
  let renderedIcon: ReactNode = null;
  if (Icon) {
    renderedIcon = (
      <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0 shadow-sm border border-emerald-100 dark:border-emerald-900/30">
        <Icon className="w-5 h-5" />
      </div>
    );
  }

  // descricao opcional, em tipografia menor e cor mais apagada.
  let renderedDescription: ReactNode = null;
  if (description) {
    renderedDescription = (
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
        {description}
      </p>
    );
  }

  // area de acoes (botoes) alinhada a direita. quebra em linha
  // quando nao cabe na horizontal (flex-wrap em mobile, nowrap em sm+).
  let renderedActions: ReactNode = null;
  if (actions) {
    renderedActions = (
      <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
        {actions}
      </div>
    );
  }

  // container: coluna em mobile, linha em sm+. a borda inferior
  // separa o cabecalho do conteudo abaixo.
  const containerClassName = 'flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-700/80 ' + className;

  return (
    <div className={containerClassName}>
      {/* bloco da esquerda: icone + titulo + badge e, embaixo,
          a descricao. */}
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