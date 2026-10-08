"use client"

import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

// wrapper do alert dialog do radix. essa familia de componentes
// segue o padrao shadcn: cada parte vira uma funcao fina que so
// repassa props pro primitivo do radix e aplica as classes do
// projeto. assim mantemos o controle de comportamento (focus trap,
// aria, fechamento no esc) sem reescrever nada.
//
// o alert dialog e pensado pra confirmacoes destrutivas ou sensiveis
// (excluir, cancelar). a diferenca dele pro dialog comum e que o
// usuario precisa interagir com um dos botoes, nao fecha clicando
// fora. por isso e o componente ideal pra ConfirmDialog.

// raiz do alert dialog. controla o estado aberto/fechado via
// prop open/onopenchange. o dataslot ajuda o shadcn a estilizar
// por parte.
function AlertDialog({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

// gatilho do alert dialog. coloca o children como elemento que
// abre o dialog ao ser clicado.
function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  )
}

// portal do alert dialog. renderiza o conteudo fora da arvore
// do dom principal, evitando problemas de overflow e z-index.
function AlertDialogPortal({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  )
}

// overlay escuro atras do dialog. o fadein/fadeout vem das
// classes data-[state=...] que o radix aplica.
function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  )
}

// conteudo do dialog. ja traz o portal e o overlay dentro, entao
// quem consome so precisa renderizar alertdialogcontent dentro do
// alertdialog raiz. anima com fade + zoom, e centraliza na tela.
function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid max-h-[85vh] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
          className
        )}
        {...props}
      />
    </AlertDialogPortal>
  )
}

// cabecalho do dialog. empilha titulo e descricao, centralizando
// em mobile e alinhando a esquerda em telas maiores.
function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

// rodape do dialog. em mobile os botoes ficam empilhados com a
// ordem invertida (acao primeiro), e em sm+ viram uma linha com
// alinhamento a direita.
function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

// titulo do dialog. semantico pro leitor de tela e com tipografia
// de destaque.
function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  )
}

// descricao do dialog. texto secundario em cor apagada.
function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

// botao de acao (o "confirmar"). reaproveita o buttonvariants do
// botao padrao pra herdar o visual consistente.
function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return (
    <AlertDialogPrimitive.Action
      className={cn(buttonVariants(), className)}
      {...props}
    />
  )
}

// botao de cancelar. usa a variante outline do botao padrao.
function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel
      className={cn(buttonVariants({ variant: "outline" }), className)}
      {...props}
    />
  )
}

// exports publicos do alert dialog. quem consome monta a estrutura
// com essas pecas (raiz + trigger + content com header/title/description
// + footer com action/cancel).
export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}