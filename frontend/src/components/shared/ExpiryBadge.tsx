export function ExpiryBadge({ expirationDate }: { expirationDate: string }) {
  const now = new Date();
  const exp = new Date(expirationDate);
  const diffMs = exp.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800">Vencido há {Math.abs(diffDays)} dias</span>;
  }
  if (diffDays <= 30) {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800">Vence em {diffDays} dias</span>;
  }
  if (diffDays <= 90) {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">Vence em {diffDays} dias</span>;
  }
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">Vence em {diffDays} dias</span>;
}
