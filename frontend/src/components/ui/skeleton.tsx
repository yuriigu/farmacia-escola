import { cn } from "@/lib/utils"

// skeleton e o "esqueleto" de carregamento: um bloco cinza que pulsa
// enquanto o dado real nao chegou. serve pra dar a sensacao de que
// o conteudo ja esta sendo montado, evitando o layout "pular" quando
// o dado chega.
// a altura e a largura sao definidas pelo consumidor via classname
// (ex: className="h-4 w-40"), porque o componente so cuida do visual
// base (fundo + animacao + cantos arredondados).
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }