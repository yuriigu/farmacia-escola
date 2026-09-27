'use client';

// imports do react
import { ReactNode } from 'react';

// imports de bibliotecas
import { Inbox } from 'lucide-react';

// imports locais
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DataTableProps } from '@/types';

// tabela de dados reutilizavel. cobre tres estados:
// - loading: mostra 5 linhas de skeleton na mesma grade das colunas
// - vazio: mostra um empty state com icone, titulo, descricao e uma
//   acao opcional
// - com dados: renderiza as linhas com zebra (linha alternada),
//   hover contextual e clique opcional na linha
// as colunas sao definidas pelo tipo column (com header, width,
// align, cell, accessorkey) do @/types.
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
  // traduz o align da coluna pra classe de texto (left/center/right).
  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    if (align === 'center') {
      return 'text-center';
    }
    if (align === 'right') {
      return 'text-right';
    }
    return 'text-left';
  };

  // acao do empty state (botao de criar, por exemplo), embrulhada
  // num wrapper com espaco superior.
  let renderedEmptyAction: ReactNode = null;
  if (emptyAction) {
    renderedEmptyAction = <div className="pt-2">{emptyAction}</div>;
  }

  // corpo da tabela. e montado por um dos tres caminhos: loading,
  // vazio, ou com dados.
  let tableBodyContent: ReactNode = null;
  // loading: 5 linhas falsas com skeleton em cada celula. o numero
  // de celulas acompanha as colunas, entao a grade fica coerente.
  if (isLoading) {
    tableBodyContent = Array.from({ length: 5 }).map((_, rIdx) => {
      return (
        <tr key={rIdx} className="animate-pulse">
          {columns.map((_, cIdx) => {
            return (
              <td key={cIdx} className="px-4 py-4">
                <Skeleton className="h-4 w-full max-w-30" />
              </td>
            );
          })}
        </tr>
      );
    });
  } else if (data.length === 0) {
    // vazio: linha unica ocupando todas as colunas, com icone
    // grande, titulo, descricao e (se veio) a acao.
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
    // com dados: percorre os itens e renderiza cada linha.
    tableBodyContent = data.map((item, rowIdx) => {
      // chave da linha. prioridade: keyextractor > item.id > index.
      let key: string | number = rowIdx;
      if (keyExtractor) {
        key = keyExtractor(item, rowIdx);
      } else if (item.id !== undefined) {
        key = item.id;
      } else {
        key = rowIdx;
      }

      // flag que muda o hover quando a linha e clicavel.
      let isClickable = false;
      if (onRowClick) {
        isClickable = true;
      } else {
        isClickable = false;
      }

      // zebra: linhas impares ganham um fundo levemente diferente.
      let rowBg = 'bg-white dark:bg-slate-800';
      if (rowIdx % 2 === 1) {
        rowBg = 'bg-slate-50/40 dark:bg-slate-800/30';
      } else {
        rowBg = 'bg-white dark:bg-slate-800';
      }

      // hover. quando clicavel, vira esmeralda pra indicar acao.
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
            // clicar na linha dispara o onrowclick (quando passado)
            // com o item e o indice.
            if (onRowClick) {
              onRowClick(item, rowIdx);
            }
          }}
          className={rowClassName}
        >
          {columns.map((col, colIdx) => {
            // conteudo da celula. prioridade: col.cell > col.accessorkey
            // > null. accessorkey mostra '-' quando o valor e nulo/undefined.
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

            // classes da celula: padding, alinhamento e classe extra
            // (quando o column define uma).
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

  // rodape opcional, separado do corpo por uma borda.
  let renderedFooter: ReactNode = null;
  if (footer) {
    renderedFooter = (
      <div className="border-t border-slate-100 dark:border-slate-700/60">
        {footer}
      </div>
    );
  }

  // classes do card externo e da tabela interna. a minwidth garante
  // scroll horizontal em telas apertadas (o overflow-x-auto fica no
  // wrapper).
  const cardClassName = 'rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden ' + className;
  const tableClassName = 'w-full text-sm text-slate-600 dark:text-slate-300 ' + minWidth;

  return (
    <Card className={cardClassName}>
      <CardContent className="p-0">
        {/* wrapper que ativa o scroll horizontal quando a tabela
            passa da largura da tela. */}
        <div className="overflow-x-auto">
          <table className={tableClassName}>
            {/* cabecalho: barra esmeralda a esquerda, fundo neutro e
                tipografia em caps com tracking. */}
            <thead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/90 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 border-l-[3px] border-l-emerald-500">
              <tr>
                {columns.map((col, idx) => {
                  // classe extra do th quando a column define.
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