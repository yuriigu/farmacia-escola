"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

// switch (toggle) do design system. envolve o switch do radix pra
// ganhar acessibilidade (role, aria-checked, teclado) e aplica as
// classes do projeto.
// visual: um trilho (o proprio switchprimitive.root) com o thumb
// (bolinha) que desliza quando marcado. as cores mudam conforme o
// estado: trilho na cor primaria quando checked, na cor de input
// quando unchecked. no dark, o thumb tambem troca de cor pra
// manter contraste.
// e usado em varias telas: ativar/desativar usuario, marcar
// preferencias, etc.
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      // o peer habilita o uso de "peer-disabled" em elementos irmaos
      // (ex: label ao lado) pra refletir o estado desabilitado.
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {/* thumb (bolinha). desliza de um lado pro outro via
          translate, e o data-[state=checked] controla a posicao.
          o calculo do translate-x usa 100%-2px pra ficar alinhado
          com a borda do trilho. as cores tambem mudam por estado
          e por tema. */}
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }