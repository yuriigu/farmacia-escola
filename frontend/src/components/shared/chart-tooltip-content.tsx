// props do tooltip customizado dos graficos (recharts).
// o recharts injeta esses campos automaticamente quando o tooltip
// esta ativo sobre uma serie. active diz se o tooltip esta em uso,
// payload traz os valores das series e label e o rotulo do eixo
// no ponto onde o mouse esta.
interface ChartTooltipContentProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

// conteudo customizado do tooltip dos graficos. existe pra padronizar
// o visual (card com borda, cores do tema) entre todos os graficos do
// dashboard. o recharts chama esse componente passando active, payload
// e label sempre que o usuario passa o mouse.
export function ChartTooltipContent({ active, payload, label }: ChartTooltipContentProps) {
  // sem active, nao tem tooltip pra renderizar (mouse fora da area).
  if (!active) {
    return null;
  }

  // sem payload, nao ha dados pra exibir. o recharts manda payload
  // undefined quando o mouse esta sobre uma area sem serie.
  if (!payload) {
    return null;
  }

  // payload vazio tambem vira null pra nao renderizar card vazio.
  if (payload.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-3 text-xs">
      {/* label do eixo (ex: nome do mes, nome da categoria) */}
      <p className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{label}</p>
      {/* uma linha por serie do payload. o pontinho colorido pega a
          cor que o recharts mandou pra serie, mantendo a
          correspondencia com o grafico. */}
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