'use client';

// IMPORTS DO REACT
import { ReactNode } from 'react';

// IMPORTS DE BIBLIOTECAS
import { LucideIcon, Inbox } from 'lucide-react';

// IMPORTS LOCAIS
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// INTERFACE DA COLUNA DA TABELA
export interface Column<T = any> {
  header: ReactNode;
  accessorKey?: keyof T | string;
  cell?: (item: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

// INTERFACE DAS PROPRIEDADES DA TABELA DE DADOS
export interface DataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRowClick?: (item: T, index: number) => void;
  minWidth?: string;
  className?: string;
  footer?: ReactNode;
  keyExtractor?: (item: T, index: number) => string | number;
}

// COMPONENTE DA TABELA DE DADOS REUTILIZAVEL
export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading = false,
  emptyIcon: EmptyIcon = Inbox,
  emptyTitle = 'Nenhum registro encontrado',
  emptyDescription = 'Não existem dados correspondentes aos filtros aplicados.',
  emptyAction,
  onRowClick,
  minWidth = 'min-w-[700px]',
  className = '',
  footer,
  keyExtractor,
}: DataTableProps<T>) {
  // FUNCAO PARA RETORNAR CLASSE DE ALINHAMENTO
  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    if (align === 'center') {
      return 'text-center';
    }
    if (align === 'right') {
      return 'text-right';
    }
    return 'text-left';
  };

  // RENDERIZANDO ACAO DO ESTADO VAZIO
  let renderedEmptyAction: ReactNode = null;
  if (emptyAction) {
    renderedEmptyAction = <div className="pt-2">{emptyAction}</div>;
  }

  // RENDERIZANDO CORPO DA TABELA
  let tableBodyContent: ReactNode = null;
  if (isLoading) {
    tableBodyContent = Array.from({ length: 5 }).map((_, rIdx) => {
      return (
        <tr key={rIdx} className="animate-pulse">
          {columns.map((_, cIdx) => {
            return (
              <td key={cIdx} className="px-4 py-4">
                <Skeleton className="h-4 w-full max-w-[120px]" />
              </td>
            );
          })}
        </tr>
      );
    });
  } else if (data.length === 0) {
    tableBodyContent = (
      <tr>
        <td colSpan={columns.length} className="px-4 py-16 text-center">
          <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400 dark:text-slate-500 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-inner">
              <EmptyIcon className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {emptyTitle}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {emptyDescription}
              </p>
            </div>
            {renderedEmptyAction}
          </div>
        </td>
      </tr>
    );
  } else {
    tableBodyContent = data.map((item, rowIdx) => {
      // DETERMINANDO A CHAVE UNICA DA LINHA
      let key: string | number = rowIdx;
      if (keyExtractor) {
        key = keyExtractor(item, rowIdx);
      } else if (item.id !== undefined) {
        key = item.id;
      } else {
        key = rowIdx;
      }

      // DETERMINANDO SE A LINHA E CLICAVEL
      let isClickable = false;
      if (onRowClick) {
        isClickable = true;
      } else {
        isClickable = false;
      }

      // DEFININDO COR DE FUNDO ALTERNADA
      let rowBg = 'bg-white dark:bg-slate-800';
      if (rowIdx % 2 === 1) {
        rowBg = 'bg-slate-50/40 dark:bg-slate-800/30';
      } else {
        rowBg = 'bg-white dark:bg-slate-800';
      }

      // DEFININDO EFEITO DE HOVER
      let hoverClass = 'hover:bg-slate-50/70 dark:hover:bg-slate-700/40';
      if (isClickable) {
        hoverClass = 'cursor-pointer hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20';
      } else {
        hoverClass = 'hover:bg-slate-50/70 dark:hover:bg-slate-700/40';
      }

      const rowClassName = 'transition-colors ' + rowBg + ' ' + hoverClass;

      return (
        <tr
          key={key}
          onClick={() => {
            if (onRowClick) {
              onRowClick(item, rowIdx);
            }
          }}
          className={rowClassName}
        >
          {columns.map((col, colIdx) => {
            // DETERMINANDO CONTEUDO DA CELULA
            let cellContent: ReactNode = null;
            if (col.cell) {
              cellContent = col.cell(item, rowIdx);
            } else if (col.accessorKey) {
              const rawValue = item[col.accessorKey];
              if (rawValue !== null) {
                if (rawValue !== undefined) {
                  cellContent = String(rawValue);
                } else {
                  cellContent = '-';
                }
              } else {
                cellContent = '-';
              }
            } else {
              cellContent = null;
            }

            // DETERMINANDO CLASSES DA CELULA
            let extraColClass = '';
            if (col.className) {
              extraColClass = col.className;
            } else {
              extraColClass = '';
            }
            const cellClassName = 'px-4 py-3.5 align-middle ' + getAlignClass(col.align) + ' ' + extraColClass;

            return (
              <td
                key={colIdx}
                className={cellClassName}
              >
                {cellContent}
              </td>
            );
          })}
        </tr>
      );
    });
  }

  // RENDERIZANDO RODAPE DA TABELA
  let renderedFooter: ReactNode = null;
  if (footer) {
    renderedFooter = (
      <div className="border-t border-slate-100 dark:border-slate-700/60">
        {footer}
      </div>
    );
  }

  const cardClassName = 'rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden ' + className;
  const tableClassName = 'w-full text-sm text-slate-600 dark:text-slate-300 ' + minWidth;

  return (
    <Card className={cardClassName}>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className={tableClassName}>
            <thead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/90 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 border-l-[3px] border-l-emerald-500">
              <tr>
                {columns.map((col, idx) => {
                  let extraHeaderClass = '';
                  if (col.headerClassName) {
                    extraHeaderClass = col.headerClassName;
                  } else {
                    extraHeaderClass = '';
                  }
                  const thClassName = 'px-4 py-3.5 font-semibold ' + getAlignClass(col.align) + ' ' + extraHeaderClass;

                  return (
                    <th
                      key={idx}
                      style={{ width: col.width }}
                      className={thClassName}
                    >
                      {col.header}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {tableBodyContent}
            </tbody>
          </table>
        </div>
        {renderedFooter}
      </CardContent>
    </Card>
  );
}