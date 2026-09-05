// IMPORTS LOCAIS
import { MEDICINE_CATEGORY_LABELS, MEDICINE_CATEGORY_COLORS } from '@/lib/Constants';

// INTERFACE DE PROPRIEDADES DO CRACHA DE CATEGORIA
interface CategoryBadgeProps {
  category?: string | null;
  className?: string;
}

// COMPONENTE PARA EXIBICAO DO CRACHA DE CATEGORIA
export function CategoryBadge({ category, className = '' }: CategoryBadgeProps) {
  // DETERMINANDO A CHAVE DA CATEGORIA
  let rawCategory = 'outro';
  if (category) {
    rawCategory = category;
  } else {
    rawCategory = 'outro';
  }
  const catKey = rawCategory.toLowerCase();

  // DETERMINANDO O ROTULO DA CATEGORIA
  let label = 'Geral';
  if (MEDICINE_CATEGORY_LABELS[catKey]) {
    label = MEDICINE_CATEGORY_LABELS[catKey];
  } else if (category) {
    label = category;
  } else {
    label = 'Geral';
  }

  // DETERMINANDO AS CLASSES DE COR
  let colorClass = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  if (MEDICINE_CATEGORY_COLORS[catKey]) {
    colorClass = MEDICINE_CATEGORY_COLORS[catKey];
  } else {
    colorClass = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }

  const combinedClassName = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ' + colorClass + ' ' + className;

  return (
    <span className={combinedClassName}>
      {label}
    </span>
  );
}