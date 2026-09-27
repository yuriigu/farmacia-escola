// imports locais
import { MEDICINE_CATEGORY_LABELS, MEDICINE_CATEGORY_COLORS } from '@/lib/constants';

// props do cracha de categoria. a categoria e opcional porque o
// componente tem fallback pra "outro"/"geral" quando nao vem nada.
interface CategoryBadgeProps {
  category?: string | null;
  className?: string;
}

// cracha de categoria de medicamento. exibe um badge colorido com o
// rotulo da categoria. tanto o texto quanto a cor vem dos mapas de
// constants (medicine_category_labels e medicine_category_colors),
// com fallback pra "geral" e pro cinza neutro quando a categoria
// nao esta no mapa.
export function CategoryBadge({ category, className = '' }: CategoryBadgeProps) {
  // normaliza a categoria em minusculo pra bater com as chaves dos
  // mapas. quando nao veio, cai em "outro".
  let rawCategory = 'outro';
  if (category) {
    rawCategory = category;
  } else {
    rawCategory = 'outro';
  }
  const catKey = rawCategory.toLowerCase();

  // resolve o rotulo amigavel. prioriza o mapa de labels; se nao
  // achar, usa o proprio valor cru da categoria; se nao houver,
  // cai em "geral".
  let label = 'Geral';
  if (MEDICINE_CATEGORY_LABELS[catKey]) {
    label = MEDICINE_CATEGORY_LABELS[catKey];
  } else if (category) {
    label = category;
  } else {
    label = 'Geral';
  }

  // resolve as classes de cor do badge. o fallback e cinza neutro
  // (bom em claro e escuro).
  let colorClass = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  if (MEDICINE_CATEGORY_COLORS[catKey]) {
    colorClass = MEDICINE_CATEGORY_COLORS[catKey];
  } else {
    colorClass = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }

  // junta as classes base com as cores e o classname externo (permite
  // ajustes visuais pontuais pelo consumidor).
  const combinedClassName = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ' + colorClass + ' ' + className;

  return (
    <span className={combinedClassName}>
      {label}
    </span>
  );
}