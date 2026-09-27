import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// botao reutilizavel do design system. usa cva pra centralizar
// as variantes visuais (default, gradient, destructive, outline,
// secondary, ghost, link) e os tamanhos (xs, sm, default, lg,
// icon, icon-sm) num lugar so.
// as classes base cobrem o comportamento comum: layout inline,
// estados de foco visivel, disabled com opacidade, efeito de
// "apertar" (active:scale) e tratamento dos svgs internos.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold text-sm transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // padrao: usa a cor primaria do tema (esmeralda no sistema).
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        // gradiente esmeralda: usado em ctas principais (login,
        // "novo agendamento", etc).
        gradient:
          "bg-linear-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/20 hover:from-emerald-700 hover:to-teal-700 hover:shadow-xl hover:shadow-emerald-600/30",
        // destrutiva: acoes perigosas (excluir, cancelar). cor
        // de destructive do tema.
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        // outline: so contorno, sem fundo solido.
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        // secundaria: tom mais neutro.
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        // ghost: sem fundo, so hover. usada em botoes de icone
        // dentro de tabelas e cards.
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        // link: parece link de texto, sem botao visual.
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // xs: botoes muito pequenos (usados em chips de acao).
        xs: "h-7 gap-1 rounded-lg px-2 text-[10px]",
        // sm: botoes compactos em barras de acao.
        sm: "h-9 gap-1.5 px-3 text-xs",
        // default: tamanho normal de formulario.
        default: "h-10 px-4 text-sm",
        // lg: ctas grandes (login, cadastro).
        lg: "h-12 px-6 text-sm",
        // icon: botao quadrado so com icone (h=w).
        icon: "size-10",
        // icon-sm: icone menor, pra linhas de tabela.
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// componente botao. aceita variant, size e aschild. com
// aschild=true, o comp vira o slot do radix, ou seja, ele nao
// renderiza um button e sim "injeta" as classes no elemento filho.
// isso e muito usado pra compor com <link>: <button aschild><link ...>
// assim o link herda o visual sem virar um button de verdade.
function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  // comp vira o slot (aschild) ou o button padrao.
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

// exporta o componente e a funcao de variantes. a funcao e usada
// por outros componentes (ex: alertdialogaction, alertdialogcancel)
// que querem reaproveitar o visual do botao sem renderizar um button.
export { Button, buttonVariants }