import { toast as sonnerToast, type ExternalToast } from 'sonner';

// Toasts sao reservados a sucesso e falhas globais/servidor. Erros
// de validacao de campo devem aparecer junto ao controle via FieldError.
// Cada nova notificacao substitui a anterior para evitar duplicatas.
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