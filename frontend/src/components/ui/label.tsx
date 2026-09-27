"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"

import { cn } from "@/lib/utils"

// label reutilizavel do design system. envolve o label do radix
// pra ganhar acessibilidade (associacao com o input via htmlfor)
// e aplica as classes base do projeto.
// as classes cobrem dois casos de desabilitado:
// - group-data-[disabled=true]: quando o label esta dentro de um
//   grupo marcado como disabled (ex: um fieldset de formulario).
// - peer-disabled: quando o input irmao (com peer) esta disabled.
// nos dois casos, o label fica sem interacao e com opacidade
// reduzida, acompanhando o input.
function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }