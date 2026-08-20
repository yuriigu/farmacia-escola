'use client';

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export function ConfirmDialog({ open, onOpenChange, title, description, onConfirm, confirmLabel = 'Confirmar', variant = 'default', loading = false }: {
  open: boolean; onOpenChange: (v: boolean) => void; title: string; description: string; onConfirm: () => void; confirmLabel?: string; variant?: 'danger' | 'default'; loading?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md animate-fade-in-scale">
        <DialogHeader>
          <DialogTitle className={'flex items-center gap-2 ' + (variant === 'danger' ? 'text-rose-600 dark:text-rose-400' : '')}>
            {variant === 'danger' && <AlertCircle className="w-5 h-5" />}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl" disabled={loading}>Cancelar</Button>
          <Button
            onClick={onConfirm} disabled={loading}
            className={variant === 'danger' ? 'rounded-xl bg-rose-600 hover:bg-rose-700 text-white' : 'rounded-xl bg-emerald-600 hover:bg-emerald-700'}
          >
            {loading ? 'Aguarde...' : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
