"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// wrapper do dialog do radix. mesma familia de componentes do
// alertdialog: cada parte vira uma funcao fina que so repassa
// props pro primitivo e aplica as classes do projeto.
// a diferenca pro alertdialog e que o dialog comum pode fechar
// clicando fora ou apertando esc, e aceita um botao x no canto.
// por isso ele e usado em modais de criacao/edicao/detalhe, que
// nao exigem uma acao especifica pra fechar.

// raiz do dialog. controla o estado aberto/fechado via prop
// open/onopenchange.
function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

// gatilho do dialog. coloca o children como elemento que abre
// o modal ao ser clicado.
function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

// portal do dialog. renderiza o conteudo fora da arvore principal
// do dom pra evitar problema de overflow e z-index.
function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

// botao de fechar do dialog. util quando o consumidor quer montar
// o proprio x em outro lugar (fora do header padrao).
function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

// overlay escuro atras do dialog. o fadein/fadeout vem das classes
// data-[state=...] que o radix aplica.
function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  )
}

// conteudo do dialog. ja inclui o portal e o overlay internamente,
// entao quem consome so precisa renderizar dialogcontent dentro do
// dialog raiz. anima com fade + zoom e centraliza na tela.
// o prop showclosebutton controla se aparece o x no canto. por
// padrao aparece, mas telas que querem forcar interacao pelos
// botoes podem desligar.
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid max-h-[85vh] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
          className
        )}
        {...props}
      >
        {children}
        {/* botao de fechar padrao no canto superior direito.
            o sr-only garante acessibilidade sem mostrar texto. */}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

// cabecalho do dialog. empilha titulo e descricao, centralizando
// em mobile e alinhando a esquerda em telas maiores.
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

// rodape do dialog. em mobile os botoes ficam empilhados com a
// ordem invertida (acao primeiro), e em sm+ viram uma linha com
// alinhamento a direita.
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
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
function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

// descricao do dialog. texto secundario em cor apagada.
function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

// exports publicos do dialog. quem consome monta a estrutura com
// essas pecas (raiz + trigger + content com header/title/description
// + footer).
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}