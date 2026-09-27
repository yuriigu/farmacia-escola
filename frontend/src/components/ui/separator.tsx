"use client"

import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"

import { cn } from "@/lib/utils"

// separador (linha divisoria) do design system. envolve o separador
// do radix, que cuida da semantica correta (role separator quando
// decorativo=true, ele fica invisivel pro leitor de tela; quando
// false, e anunciado como divisor real).
// aceita duas orientacoes: horizontal (linha fina no topo, largura
// total) e vertical (linha fina a esquerda, altura total). a cor
// segue o token bg-border do tema, entao funciona em claro e escuro.
function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        // horizontal: 1px de altura, largura total.
        // vertical: 1px de largura, altura total.
        "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className
      )}
      {...props}
    />
  )
}

export { Separator }