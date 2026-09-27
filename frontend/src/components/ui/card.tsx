import * as React from "react"

import { cn } from "@/lib/utils"

// familia de card do design system. cada parte e uma funcao fina
// que so aplica as classes base e repassa props pro div. a
// composicao fica:
//   card
//     cardheader (titulo + descricao + cardaction)
//     cardcontent
//     cardfooter
// o dataslot ajuda a estilizar por parte e habilita seletor como
// "has-data-[slot=card-action]" no header.

// card container. coluna com gap vertical, borda, cantos
// arredondados e sombra leve. aceita classname pra ajustes
// pontuais (larguras, variantes visuais).
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
        className
      )}
      {...props}
    />
  )
}

// cabecalho do card. a grade com "auto-rows-min" empilha titulo e
// descricao, e o seletor "has-data-[slot=card-action]" faz o grid
// virar 2 colunas quando ha um cardaction (ele fica a direita).
// se o header tiver borda inferior, o [.border-b] adiciona o
// padding de baixo (o padrao so tem pb no py do card).
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

// titulo do card. tipografia de destaque com leading apertado.
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

// descricao do card. texto secundario em cor apagada.
function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

// acao do card (botao de "editar", "excluir", etc). fica no canto
// superior direito do cabecalho. o posicionamento com col-start-2
// e row-span-2 e o que faz ele alinhar com o titulo/descricao,
// funcionando junto com o grid do cardheader.
function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

// area de conteudo do card. padding horizontal padrao.
function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

// rodape do card. linha com padding horizontal, e padding superior
// extra quando o rodape tem borda em cima ([.border-t]:pt-6).
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

// exports publicos do card. quem consome monta a composicao usando
// as pecas que precisar (cardheader, cardtitle, cardcontent, etc).
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}