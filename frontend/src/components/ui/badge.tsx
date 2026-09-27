import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// badge (pilula) reutilizavel do design system. usa cva pra
// organizar as variantes visuais (default, secondary, destructive
// e outline) num lugar so, deixando o consumo limpo:
// <badge variant="outline">...</badge>.
// o foco visivel, o sizing e o comportamento com svg dentro
// ficam nas classes base, entao todas as variantes herdam isso.
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        // padrao: usa a cor primaria do tema (esmeralda no sistema).
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        // secundaria: tom mais neutro.
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        // destrutiva: pra status de erro ou acao perigosa.
        // o hover e o focus visivel seguem a cor de destructive.
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        // outline: so contorno, sem fundo. o hover usa accent.
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

// componente badge. aceita variant (do cva) e aschild.
// com aschild=true, o comp vira o slot do radix, ou seja, ele nao
// renderiza um span e sim "injeta" as classes no elemento filho.
// isso e util quando o badge precisa ser um link, por exemplo.
function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  // comp vira o slot (aschild) ou o span padrao.
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

// exporta o componente e a funcao de variantes (caso algum consumidor
// queira montar um elemento customizado reaproveitando as mesmas
// classes do badge).
export { Badge, badgeVariants }