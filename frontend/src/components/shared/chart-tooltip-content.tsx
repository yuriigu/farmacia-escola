// INTERFACE DAS PROPRIEDADES DO TOOLTIP DO GRAFICO
interface ChartTooltipContentProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

// COMPONENTE PARA O CONTEUDO DO TOOLTIP DOS GRAFICOS
export function ChartTooltipContent({ active, payload, label }: ChartTooltipContentProps) {
  // VERIFICANDO SE O TOOLTIP ESTA ATIVO
  if (!active) {
    return null;
  }

  // VERIFICANDO SE O PAYLOAD EXISTE E POSSUI ITENS
  if (!payload) {
    return null;
  }

  if (payload.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{label}</p>
      {payload.map((entry, i) => {
        return (
          <p key={i} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
            {entry.name}: <span className="font-bold">{entry.value}</span>
          </p>
        );
      })}
    </div>
  );
}
