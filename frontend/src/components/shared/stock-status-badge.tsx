// imports locais
import type { StockStatus } from '@/types';

// props do cracha de status de estoque. aceita tanto o tipo
// stockstatus quanto string, porque o componente cobre tanto os
// valores do enum do backend quanto valores legados em portugues
// (ex: "bloqueado", "vencido", "esgotado").
interface StockStatusBadgeProps {
  status?: StockStatus | string;
}

// cracha de status de estoque. mostra um badge com pontinho colorido
// + rotulo, cobrindo todos os estados possiveis: bloqueado, em dia,
// baixo, critico, vencimento proximo, vencido, esgotado e ativo.
// o default e "ativo" quando nao veio nada. cada status tem uma cor
// especifica e o bloqueado tem pontinho pulsante pra chamar atencao.
export function StockStatusBadge({ status }: StockStatusBadgeProps) {
  // valores default (usados no fallback). ja comeca em "ativo",
  // que e o caso mais comum.
  let labelText = 'Ativo';
  let badgeBg = 'bg-emerald-50 dark:bg-emerald-950/40';
  let badgeText = 'text-emerald-700 dark:text-emerald-400';
  let badgeBorder = 'border-emerald-200 dark:border-emerald-800/80';
  let dotColor = 'bg-emerald-500';

  // resolve label/cor/pontinho de acordo com o status. cada branch
  // cobre uma variacao do valor (enum do backend ou valor legado
  // em portugues).
  if (status) {
    // bloqueado: usa rose forte e pontinho pulsante, porque e uma
    // trava sanitaria que precisa chamar atencao.
    if (status === 'BLOCKED') {
      labelText = 'Bloqueado';
      badgeBg = 'bg-rose-100 dark:bg-rose-950/70';
      badgeText = 'text-rose-800 dark:text-rose-300 font-bold';
      badgeBorder = 'border-rose-400 dark:border-rose-700';
      dotColor = 'bg-rose-600 animate-pulse';
    } else if (status === 'Bloqueado') {
      // variacao em portugues do bloqueado.
      labelText = 'Bloqueado';
      badgeBg = 'bg-rose-100 dark:bg-rose-950/70';
      badgeText = 'text-rose-800 dark:text-rose-300 font-bold';
      badgeBorder = 'border-rose-400 dark:border-rose-700';
      dotColor = 'bg-rose-600 animate-pulse';
    } else if (status === 'ok') {
      // estoque em dia (variacao curta).
      labelText = 'Em dia';
      badgeBg = 'bg-emerald-50 dark:bg-emerald-950/40';
      badgeText = 'text-emerald-700 dark:text-emerald-400';
      badgeBorder = 'border-emerald-200 dark:border-emerald-800/80';
      dotColor = 'bg-emerald-500';
    } else if (status === 'low') {
      // estoque baixo (variacao curta).
      labelText = 'Baixo';
      badgeBg = 'bg-amber-50 dark:bg-amber-950/40';
      badgeText = 'text-amber-800 dark:text-amber-300';
      badgeBorder = 'border-amber-300 dark:border-amber-700';
      dotColor = 'bg-amber-500';
    } else if (status === 'critical') {
      // critico (variacao curta).
      labelText = 'Crítico';
      badgeBg = 'bg-slate-100 dark:bg-slate-800';
      badgeText = 'text-slate-600 dark:text-slate-400';
      badgeBorder = 'border-slate-300 dark:border-slate-700';
      dotColor = 'bg-slate-400';
    } else if (status === 'CRITICAL_EXPIRATION' || status === 'Venc. Próx' || status === 'Vencimento Próximo' || status === 'Vencimento Próximo (≤ 30d)') {
      // varias variacoes de "vence em ate 30 dias" acabam no mesmo
      // visual (label "venc. prox" em ambar).
      labelText = 'Venc. Próx';
      badgeBg = 'bg-amber-50 dark:bg-amber-950/40';
      badgeText = 'text-amber-800 dark:text-amber-300';
      badgeBorder = 'border-amber-300 dark:border-amber-700';
      dotColor = 'bg-amber-500';
    } else if (status === 'EXPIRED') {
      // vencido (variacao do enum).
      labelText = 'Vencido';
      badgeBg = 'bg-rose-50 dark:bg-rose-950/40';
      badgeText = 'text-rose-700 dark:text-rose-400';
      badgeBorder = 'border-rose-300 dark:border-rose-800';
      dotColor = 'bg-rose-600';
    } else if (status === 'expired') {
      // vencido (variacao em minuscula).
      labelText = 'Vencido';
      badgeBg = 'bg-rose-50 dark:bg-rose-950/40';
      badgeText = 'text-rose-700 dark:text-rose-400';
      badgeBorder = 'border-rose-300 dark:border-rose-800';
      dotColor = 'bg-rose-600';
    } else if (status === 'Vencido') {
      // vencido (variacao em portugues).
      labelText = 'Vencido';
      badgeBg = 'bg-rose-50 dark:bg-rose-950/40';
      badgeText = 'text-rose-700 dark:text-rose-400';
      badgeBorder = 'border-rose-300 dark:border-rose-800';
      dotColor = 'bg-rose-600';
    } else if (status === 'OUT_OF_STOCK') {
      // sem estoque (variacao do enum).
      labelText = 'Esgotado';
      badgeBg = 'bg-slate-100 dark:bg-slate-800';
      badgeText = 'text-slate-600 dark:text-slate-400';
      badgeBorder = 'border-slate-300 dark:border-slate-700';
      dotColor = 'bg-slate-400';
    } else if (status === 'Esgotado') {
      // sem estoque (variacao em portugues).
      labelText = 'Esgotado';
      badgeBg = 'bg-slate-100 dark:bg-slate-800';
      badgeText = 'text-slate-600 dark:text-slate-400';
      badgeBorder = 'border-slate-300 dark:border-slate-700';
      dotColor = 'bg-slate-400';
    } else if (status === 'Ativo') {
      // ativo (variacao em portugues).
      labelText = 'Ativo';
      badgeBg = 'bg-emerald-50 dark:bg-emerald-950/40';
      badgeText = 'text-emerald-700 dark:text-emerald-400';
      badgeBorder = 'border-emerald-200 dark:border-emerald-800/80';
      dotColor = 'bg-emerald-500';
    } else if (status === 'IN_STOCK') {
      // em estoque (variacao do enum).
      labelText = 'Ativo';
      badgeBg = 'bg-emerald-50 dark:bg-emerald-950/40';
      badgeText = 'text-emerald-700 dark:text-emerald-400';
      badgeBorder = 'border-emerald-200 dark:border-emerald-800/80';
      dotColor = 'bg-emerald-500';
    } else {
      // qualquer valor nao reconhecido cai no "ativo" padrao.
      labelText = 'Ativo';
      badgeBg = 'bg-emerald-50 dark:bg-emerald-950/40';
      badgeText = 'text-emerald-700 dark:text-emerald-400';
      badgeBorder = 'border-emerald-200 dark:border-emerald-800/80';
      dotColor = 'bg-emerald-500';
    }
  } else {
    // sem status, assume "ativo" (caso comum de medicamento normal).
    labelText = 'Ativo';
    badgeBg = 'bg-emerald-50 dark:bg-emerald-950/40';
    badgeText = 'text-emerald-700 dark:text-emerald-400';
    badgeBorder = 'border-emerald-200 dark:border-emerald-800/80';
    dotColor = 'bg-emerald-500';
  }

  // monta as classes finais do badge (base + bg + texto + borda) e
  // do pontinho colorido.
  const badgeClassName =
    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ' +
    badgeBg +
    ' ' +
    badgeText +
    ' ' +
    badgeBorder;
  const dotClassName = 'w-1.5 h-1.5 rounded-full ' + dotColor;

  return (
    <span className={badgeClassName}>
      {/* pontinho colorido que reflete o estado. no bloqueado, pulsa. */}
      <span className={dotClassName} />
      {labelText}
    </span>
  );
}