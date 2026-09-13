import { toast as sonnerToast, type ExternalToast } from 'sonner';

function emit(
  level: 'success' | 'error',
  message: string,
  data?: ExternalToast,
): string | number {
  sonnerToast.dismiss();
  return sonnerToast[level](message, data);
}

export const toast = {
  success: (message: string, data?: ExternalToast) => emit('success', message, data),
  error: (message: string, data?: ExternalToast) => emit('error', message, data),
  dismiss: () => sonnerToast.dismiss(),
};
