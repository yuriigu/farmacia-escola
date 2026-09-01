'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function NewAppointmentRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const medId = searchParams.get('medicineId');
    if (medId) {
      router.replace(`/appointments?new=1&medicineId=${medId}`);
    } else {
      router.replace('/appointments?new=1');
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500">
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
      Redirecionando para novo agendamento...
    </div>
  );
}

export default function NewAppointmentRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500">
          Carregando...
        </div>
      }
    >
      <NewAppointmentRedirectContent />
    </Suspense>
  );
}