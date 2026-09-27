import * as React from "react"

import { cn } from "@/lib/utils"

// textarea reutilizavel do design system. e um wrapper fino em
// volta do <textarea> nativo: aplica as classes base e repassa o
// resto das props.
// cobre os mesmos estados do input (foco com anel, erro via
// aria-invalid, disabled com opacidade e placeholder em cor
// apagada), so que com altura minima maior (min-h-16) e
// dimensionamento automatico pelo field-sizing-content: o campo
// acompanha o conteudo conforme o usuario digita, sem precisar
// setar rows manualmente.
// e usado em observacoes, justificativas e outros campos de texto
// livre.
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }