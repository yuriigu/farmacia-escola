'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { hasRouteAccess, AppRole } from '@/config/rbac';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, loading, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // If unauthenticated after loading, redirect to login
  useEffect(() => {
    if (!loading && !token) {
      const redirectUrl = pathname && pathname !== '/' ? `/login?redirect=${encodeURIComponent(pathname)}` : '/login';
      router.replace(redirectUrl);
    }
  }, [loading, token, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm">Verificando permissões de acesso...</p>
      </div>
    );
  }

  if (!token || !user) {
    return null;
  }

  // Permission evaluation
  let isAuthorized = true;

  if (allowedRoles && allowedRoles.length > 0) {
    isAuthorized = allowedRoles.map((r) => r.toUpperCase()).includes(user.role.toUpperCase());
  } else if (routeKey) {
    isAuthorized = hasRouteAccess(user.role, routeKey);
  } else if (pathname) {
    isAuthorized = hasRouteAccess(user.role, pathname);
  }

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
              Seu perfil não possui permissão para acessar esta área do sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Seu perfil atual:</span>
                <Badge variant="outline" className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold uppercase">
                  {user.role}
                </Badge>
              </div>
              {allowedRoles && allowedRoles.length > 0 && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60">
                  <span className="text-slate-500">Perfis permitidos:</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {allowedRoles.map((role) => (
                      <Badge key={role} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

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
