'use client';

import { ReactNode } from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export interface Column<T = any> {
  header: ReactNode;
  accessorKey?: keyof T | string;
  cell?: (item: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

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
  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    if (align === 'center') return 'text-center';
    if (align === 'right') return 'text-right';
    return 'text-left';
  };

  return (
    <Card className={`rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden ${className}`}>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className={`w-full text-sm text-slate-600 dark:text-slate-300 ${minWidth}`}>
            <thead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/90 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 border-l-[3px] border-l-emerald-500">
              <tr>
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    style={{ width: col.width }}
                    className={`px-4 py-3.5 font-semibold ${getAlignClass(col.align)} ${col.headerClassName || ''}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, rIdx) => (
                  <tr key={rIdx} className="animate-pulse">
                    {columns.map((_, cIdx) => (
                      <td key={cIdx} className="px-4 py-4">
                        <Skeleton className="h-4 w-full max-w-[120px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
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
                      {emptyAction && <div className="pt-2">{emptyAction}</div>}
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((item, rowIdx) => {
                  const key = keyExtractor
                    ? keyExtractor(item, rowIdx)
                    : item.id !== undefined
                    ? item.id
                    : rowIdx;
                  const isClickable = !!onRowClick;

                  return (
                    <tr
                      key={key}
                      onClick={() => onRowClick && onRowClick(item, rowIdx)}
                      className={`transition-colors ${
                        rowIdx % 2 === 1
                          ? 'bg-slate-50/40 dark:bg-slate-800/30'
                          : 'bg-white dark:bg-slate-800'
                      } ${
                        isClickable
                          ? 'cursor-pointer hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-700/40'
                      }`}
                    >
                      {columns.map((col, colIdx) => (
                        <td
                          key={colIdx}
                          className={`px-4 py-3.5 align-middle ${getAlignClass(col.align)} ${col.className || ''}`}
                        >
                          {col.cell
                            ? col.cell(item, rowIdx)
                            : col.accessorKey
                            ? String(item[col.accessorKey] ?? '-')
                            : null}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {footer && <div className="border-t border-slate-100 dark:border-slate-700/60">{footer}</div>}
      </CardContent>
    </Card>
  );
}