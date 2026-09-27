"use client"

import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

// area de scroll estilizada, baseada no scroll area do radix.
// troca a scrollbar nativa do browser por uma barra customizada
// (com as cores do tema), o que da consistencia visual entre
// navegadores e sistemas. e usada, por exemplo, na sidebar e em
// paineis internos que precisam rolar sem poluir a tela.

// container externo do scroll area. ja inclui o viewport interno,
// a scrollbar customizada e o corner (o cantinho entre as duas
// barras quando ambas aparecem). aceita classname pra ajustes
// pontuais no layout (alturas, flex, etc).
function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      {/* viewport e onde o conteudo rola de fato. o foco visivel
          segue o padrao do sistema (anel com a cor do tema). */}
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {/* scrollbar vertical por padrao. quem quiser horizontal
          passa o prop orientation. */}
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

// scrollbar customizada. a orientation decide se e vertical
// (barra fina a direita) ou horizontal (barra fina embaixo).
// o touch-none evita que o gesto da scrollbar seja capturado
// como scroll de toque em mobile.
function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        // base comum as duas orientacoes.
        "flex touch-none p-px transition-colors select-none",
        // vertical: barra a direita com borda transparente.
        orientation === "vertical" &&
          "h-full w-2.5 border-l border-l-transparent",
        // horizontal: barra embaixo com borda transparente.
        orientation === "horizontal" &&
          "h-2.5 flex-col border-t border-t-transparent",
        className
      )}
      {...props}
    >
      {/* thumb e a parte "arrastavel" da barra. o bg-border usa
          a cor de borda do tema. */}
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="bg-border relative flex-1 rounded-full"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }