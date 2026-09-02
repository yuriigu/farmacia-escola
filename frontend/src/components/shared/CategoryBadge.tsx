import { MEDICINE_CATEGORY_LABELS, MEDICINE_CATEGORY_COLORS } from '@/lib/constants';

interface CategoryBadgeProps {
  category?: string | null;
  className?: string;
}

export function CategoryBadge({ category, className = '' }: CategoryBadgeProps) {
  const catKey = (category || 'outro').toLowerCase();
  const label = MEDICINE_CATEGORY_LABELS[catKey] || category || 'Geral';
  const colorClass = MEDICINE_CATEGORY_COLORS[catKey] || 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClass} ${className}`}
    >
      {label}
    </span>
  );
}