import { toast as sonnerToast, type ExternalToast } from 'sonner';

// helper interno que centraliza a emissao de toast. antes de
// mostrar o novo, ele sempre dispensa o anterior (sonnertoast.dismiss()).
// isso evita empilhar toasts quando varias acoes disparam em
// sequencia — a tela mostra sempre o mais recente, sem poluir.
function emit(
  level: 'success' | 'error',
  message: string,
  data?: ExternalToast,
): string | number {
  sonnerToast.dismiss();
  return sonnerToast[level](message, data);
}

// wrapper do toast do sonner usado no app inteiro. expoe so os
// tres casos que a gente usa hoje (success, error e dismiss),
// evitando que o resto do codigo importe o sonner direto. se um
// dia a lib for trocada, so esse arquivo muda.
export const toast = {
  success: (message: string, data?: ExternalToast) => emit('success', message, data),
  error: (message: string, data?: ExternalToast) => emit('error', message, data),
  dismiss: () => sonnerToast.dismiss(),
};