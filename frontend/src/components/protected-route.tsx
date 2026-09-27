'use client';

// imports do react
import { ReactNode, useEffect } from 'react';

// imports de bibliotecas
import { useRouter, usePathname } from 'next/navigation';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

// imports locais
import { useAuthStore } from '@/lib/auth-store';
import { hasRouteAccess } from '@/config/rbac';
import type { AppRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// props do wrapper de protecao de rota. da pra restringir de tres
// formas (em ordem de prioridade):
// - allowedroles: lista explicita de papeis aceitos
// - routekey: chave canonica da rota (consultada no config/rbac)
// - pathname: fallback que usa a url atual
interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: (AppRole | string)[];
  routeKey?: string;
  fallback?: ReactNode;
}

// wrapper de protecao de rota. encapsula a autorizacao de acesso
// em tres checagens: autenticacao (tem token?), hidratacao da
// sessao (loading) e autorizacao (papel/rota permitida).
// se faltar autenticacao, redireciona pro /login com um parametro
// ?redirect= pra voltar depois. se estiver autenticado mas sem
// acesso, mostra a tela "acesso nao autorizado" (ou o fallback
// customizado, se foi passado).
export function ProtectedRoute({
  children,
  allowedRoles,
  routeKey,
  fallback,
}: ProtectedRouteProps) {
  // hooks de navegacao e roteamento.
  const router = useRouter();
  const pathname = usePathname();

  // estado da sessao na store de auth (user, token, loading da
  // hidratacao e a funcao de hidratar).
  const { user, token, loading, hydrate } = useAuthStore();

  // hidrata a store uma vez ao montar. isso le token/user do
  // storage e popula o estado.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // se a hidratacao terminou e nao ha token, redireciona pro login.
  // o redirect preserva a rota atual na query pra voltar depois.
  useEffect(() => {
    if (!loading) {
      if (!token) {
        let redirectUrl = '/login';
        if (pathname) {
          if (pathname !== '/') {
            redirectUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
          } else {
            redirectUrl = '/login';
          }
        } else {
          redirectUrl = '/login';
        }
        router.replace(redirectUrl);
      }
    }
  }, [loading, token, pathname, router]);

  // enquanto a hidratacao nao terminou, mostra um spinner. evita
  // piscar a tela "acesso negado" num usuario que so esta sendo
  // carregado do storage.
  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm">Verificando permissões de acesso...</p>
      </div>
    );
  }

  // sem token, nao renderiza nada (o useeffect ja esta redirecionando).
  if (!token) {
    return null;
  }

  // sem user, tambem nao renderiza (estado intermediario).
  if (!user) {
    return null;
  }

  // avaliacao da autorizacao. a prioridade e:
  // 1) allowedroles (quando passado e nao vazio)
  // 2) routekey (consultado no config/rbac)
  // 3) pathname (fallback com a url atual)
  let isAuthorized = true;

  if (allowedRoles) {
    if (allowedRoles.length > 0) {
      // normaliza tudo em maiusculo pra comparacao ser case-insensitive.
      const upperAllowed = allowedRoles.map((r) => r.toUpperCase());
      const userRoleUpper = user.role.toUpperCase();
      isAuthorized = upperAllowed.includes(userRoleUpper);
    } else if (routeKey) {
      isAuthorized = hasRouteAccess(user.role, routeKey);
    } else if (pathname) {
      isAuthorized = hasRouteAccess(user.role, pathname);
    }
  } else if (routeKey) {
    isAuthorized = hasRouteAccess(user.role, routeKey);
  } else if (pathname) {
    isAuthorized = hasRouteAccess(user.role, pathname);
  }

  // se nao estiver autorizado, mostra o fallback (quando passado)
  // ou a tela padrao de "acesso nao autorizado" com cta pro dashboard.
  if (!isAuthorized) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Acesso Não Autorizado
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              Você não tem permissão para realizar esta ação.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="flex gap-2">
              <Button
                variant="default"
                className="w-full"
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // autorizado: renderiza o conteudo protegido.
  return <>{children}</>;
}