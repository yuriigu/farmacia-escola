import { TriangleAlert } from 'lucide-react';

type FormErrorProps = {
  message: string;
};

// banner de erro fixo exibido dentro de formularios e modais quando uma
// acao (validacao de negocio ou falha de backend) falha. fica visivel
// ate o usuario corrigir os dados ou tentar submeter de novo. o
// role='alert' faz leitores de tela anunciarem a mensagem. usa a mesma
// paleta rose do fielderror pra manter consistencia visual.
export function FormError({ message }: FormErrorProps) {
  if (!message) {
    return null;
  }
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
    >
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
