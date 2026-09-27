'use client';

import { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// provider do react-query. fica no topo do app (dentro do themeprovider)
// e passa o queryclient pra toda a arvore. o client e criado uma unica
// vez via usestate (inicializacao lazy), evitando recriar cache a cada
// render.
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
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 15, // 15 minutes
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            refetchOnReconnect: false,
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}