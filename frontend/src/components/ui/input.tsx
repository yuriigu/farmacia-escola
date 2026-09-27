import * as React from "react"

import { cn } from "@/lib/utils"

// input de texto reutilizavel do design system. e um wrapper fino
// em volta do <input> nativo: aplica as classes base do projeto e
// repassa o resto das props.
// cobre os principais casos visuais: foco com anel, estado de erro
// (aria-invalid), estado disabled, selecao com cores do tema e o
// comportamento quando o input e do tipo file.
// o h-9 e o px-3 sao o padrao base; cada tela ajusta (ex: h-10,
// rounded-xl) via classname.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // classe base: layout, tipografia, cores por estado, foco
        // e tratamento dos pseudo-elementos do file input.
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        // foco visivel: borda e anel seguem a cor do tema.
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        // estado de erro: anel e borda na cor destrutiva.
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }