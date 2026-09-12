'use client';

// IMPORTS DO REACT
import { ReactNode, useEffect } from 'react';

// IMPORTS DE BIBLIOTECAS
import { useRouter, usePathname } from 'next/navigation';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';

// IMPORTS LOCAIS
import { useAuthStore } from '@/lib/auth-store';
import { hasRouteAccess, AppRole } from '@/config/rbac';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: (AppRole | string)[];
  routeKey?: string;
  fallback?: ReactNode;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  routeKey,
  fallback,
}: ProtectedRouteProps) {
  // HOOKS DE NAVEGACAO E ROTEAMENTO
  const router = useRouter();
  const pathname = usePathname();

  // OBTENDO ESTADO DE AUTENTICACAO
  const { user, token, loading, hydrate } = useAuthStore();

  // HIDRATANDO ESTADO DE AUTENTICACAO
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // REDIRECIONANDO SE NAO ESTIVER AUTENTICADO
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

  // EXIBINDO SPINNER ENQUANTO CARREGA
  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm">Verificando permissões de acesso...</p>
      </div>
    );
  }

  // VERIFICANDO SE EXISTE TOKEN
  if (!token) {
    return null;
  }

  // VERIFICANDO SE EXISTE USUARIO
  if (!user) {
    return null;
  }

  // AVALIANDO PERMISSOES DO USUARIO
  let isAuthorized = true;

  if (allowedRoles) {
    if (allowedRoles.length > 0) {
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

  // SE NAO ESTIVER AUTORIZADO
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
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
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

  return <>{children}</>;
}
