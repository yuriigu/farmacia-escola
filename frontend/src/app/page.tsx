'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

// componente de redirecionamento da raiz. decide pra onde o usuario
// vai ao abrir /: se esta autenticado (tem token e user), manda pro
// dashboard; senao, manda pro login. fica separado da rota principal
// pra poder ficar dentro do suspense, padrao das outras telas.
function RootRedirect() {
  const router = useRouter();
  const { token, user, loading, hydrate } = useAuthStore();

  // hidrata a store de auth uma vez ao montar. isso le o token/user
  // do storage (cookie/localstorage) e popula o estado. enquanto
  // loading estiver true, a gente nao decide o redirecionamento.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // quando a hidratacao termina, redireciona pro destino certo.
  // replace (nao push) pra nao sujar o historico com a propria raiz.
  useEffect(() => {
    if (!loading) {
      if (token && user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [token, user, loading, router]);

  // enquanto decide, mostra spinner centralizado. a proxima tela
  // chega logo, entao e so um feedback rapido.
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
      Carregando Farmácia Escola...
    </div>
  );
}

// rota raiz. so envolve o rootredirect num suspense pra padronizar
// com as outras telas e dar um fallback de loading enquanto monta.
export default function RootPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
      <RootRedirect />
    </Suspense>
  );
}