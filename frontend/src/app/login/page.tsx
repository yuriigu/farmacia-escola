'use client';

import { LoginPage } from '@/components/pages/login-page';
import { useRouter } from 'next/navigation';

// rota de login. e uma pagina publica (nao passa pelo protected-route
// nem pelo appshell), porque o usuario ainda nao esta autenticado.
// o unico trabalho aqui e montar a loginpage e ligar a navegacao
// pra tela de cadastro.
export default function LoginRoutePage() {
  const router = useRouter();

  return (
    <LoginPage
      // callback disparado quando o usuario clica em "criar conta"
      // na tela de login. leva pra rota /register.
      onSwitchToRegister={() => {
        router.push('/register');
      }}
    />
  );
}