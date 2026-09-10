'use client';

// IMPORTS DE BIBLIOTECAS
import { AlertCircle } from 'lucide-react';

// IMPORTS LOCAIS
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// INTERFACE DAS PROPRIEDADES DA CAIXA DE CONFIRMACAO
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

// COMPONENTE DE DIALOGO DE CONFIRMACAO
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
  // DETERMINANDO CLASSES DO TITULO
  let titleClasses = 'flex items-center gap-2 ';
  if (variant === 'danger') {
    titleClasses = titleClasses + 'text-rose-600 dark:text-rose-400';
  }

  // DETERMINANDO ICONE DO TITULO
  const dangerIcon = variant === 'danger' ? (
    <AlertCircle className="w-5 h-5" />
  ) : null;

  // DETERMINANDO CLASSES DO BOTAO DE CONFIRMACAO
  let buttonClasses = 'rounded-xl bg-emerald-600 hover:bg-emerald-700';
  if (variant === 'danger') {
    buttonClasses = 'rounded-xl bg-rose-600 hover:bg-rose-700 text-white';
  } else {
    buttonClasses = 'rounded-xl bg-emerald-600 hover:bg-emerald-700';
  }

  // DETERMINANDO O TEXTO DO BOTAO
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
          <Button
            onClick={onConfirm}
            disabled={loading}
            className={buttonClasses}
          >
            {buttonText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
