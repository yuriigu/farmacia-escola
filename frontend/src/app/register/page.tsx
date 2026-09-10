'use client';

import { RegisterPage } from '@/components/pages/register-page';
import { useRouter } from 'next/navigation';

export default function RegisterRoutePage() {
  const router = useRouter();

  return (
    <RegisterPage
      onSwitchToLogin={() => {
        router.push('/login');
      }}
    />
  );
}
