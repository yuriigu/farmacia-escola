'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

function RootRedirect() {
  const router = useRouter();
  const { token, user, loading, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!loading) {
      if (token && user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [token, user, loading, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
      Carregando Farmácia Escola...
    </div>
  );
}

export default function RootPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
      <RootRedirect />
    </Suspense>
  );
}
