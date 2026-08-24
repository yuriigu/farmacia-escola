'use client';

import { LoginPage } from '@/components/pages/LoginPage';
import { useRouter } from 'next/navigation';

export default function LoginRoutePage() {
  const router = useRouter();

  return (
    <LoginPage
      onSwitchToRegister={() => {
        router.push('/register');
      }}
    />
  );
}
