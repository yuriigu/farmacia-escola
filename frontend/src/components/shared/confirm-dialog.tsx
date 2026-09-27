'use client';

// imports de bibliotecas
import { AlertCircle } from 'lucide-react';

// imports locais
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// props do dialog de confirmacao. a variant controla se e uma acao
// destrutiva (danger) ou comum (default). o loading desabilita os
// botoes enquanto a acao esta em andamento.
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmLabel?: string;
  variant?: 'danger' | 'default';
  loading?: boolean;
}

// dialogo de confirmacao generico. serve pra qualquer acao que precise
// de "tem certeza?" antes de executar (excluir, bloquear, cancelar).
// a variant='danger' adiciona icone de alerta no titulo e aplica a
// variante destrutiva no botao de confirmacao, mantendo o visual
// consistente com o resto do sistema.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel = 'Confirmar',
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  // classes do titulo. em danger, ganha cor rose pra reforcar o aviso.
  let titleClasses = 'flex items-center gap-2 ';
  if (variant === 'danger') {
    titleClasses = titleClasses + 'text-rose-600 dark:text-rose-400';
  }

  // icone de alerta ao lado do titulo, so em danger.
  const dangerIcon = variant === 'danger' ? (
    <AlertCircle className="w-5 h-5" />
  ) : null;

  // variante do botao de confirmacao. danger vira destructive pra
  // herdar a cor vermelha do sistema de botoes.
  let buttonVariant: 'default' | 'destructive' = 'default';
  if (variant === 'danger') {
    buttonVariant = 'destructive';
  }

  // texto do botao. durante o loading, mostra "aguarde..." pra deixar
  // claro que a acao esta rodando.
  let buttonText = confirmLabel;
  if (loading) {
    buttonText = 'Aguarde...';
  } else {
    buttonText = confirmLabel;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md animate-fade-in-scale">
        <DialogHeader>
          <DialogTitle className={titleClasses}>
            {dangerIcon}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3 pt-2">
          {/* botao de cancelar. so fecha o dialog, nao dispara nada.
              fica desabilitado durante o loading. */}
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
            className="rounded-xl"
            disabled={loading}
          >
            Cancelar
          </Button>
          {/* botao de confirmar. dispara o onconfirm e fica
              desabilitado durante o loading pra evitar duplo clique. */}
          <Button
            onClick={onConfirm}
            disabled={loading}
            variant={buttonVariant}
          >
            {buttonText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}