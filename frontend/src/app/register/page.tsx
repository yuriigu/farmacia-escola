'use client';

import { RegisterPage } from '@/components/pages/register-page';
import { useRouter } from 'next/navigation';

// rota de cadastro publico de paciente. e uma pagina publica (nao
// passa pelo protected-route nem pelo appshell), porque o usuario
// ainda nao esta autenticado. o unico trabalho aqui e montar a
// registerpage e ligar a navegacao de volta pra tela de login.
export default function RegisterRoutePage() {
  const router = useRouter();

  return (
    <RegisterPage
      // callback disparado quando o usuario clica em "ja tenho conta"
      // na tela de cadastro. leva pra rota /login.
      onSwitchToLogin={() => {
        router.push('/login');
      }}
    />
  );
}