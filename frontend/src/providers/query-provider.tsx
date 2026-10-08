'use client';

import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// provider do react-query. fica no topo do app (dentro do themeprovider)
// e passa o singleton de modulo do queryclient pra toda a arvore.
//
// as opcoes default foram ajustadas pra reduzir rajadas de requisicoes:
// - staletime 5min: dado e considerado fresco por 5 min, entao navegar
//   entre abas nao dispara refetch.
// - gctime 15min: cache inativo fica em memoria por 15 min antes de
//   ser descartado.
// - refetchonwindowfocus/onmount/onreconnect desligados: sem isso, o
//   appshell remontava ao trocar de aba e refazia get /medicines,
//   /appointments e /patients a cada navegacao.
// - retry 1: uma tentativa extra em caso de falha, sem exagerar.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 15,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}