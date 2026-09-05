'use client';

// IMPORTS DE BIBLIOTECAS
import { useRouter } from 'next/navigation';

// IMPORTS LOCAIS
import { useAuthStore } from '@/lib/AuthStore';
import { api } from '@/services/Api';

// HOOK PERSONALIZADO PARA AUTENTICACAO
export function useAuth() {
  // ESTADO GLOBAL DE AUTENTICACAO
  const { user, token, loading, setAuth, logout: storeLogout } = useAuthStore();
  const router = useRouter();

  // FUNCAO PARA REALIZAR LOGIN
  const login = async (email: string, pass: string) => {
    const data = await api.auth.login(email, pass);
    setAuth(data.token, data.user);
    return data;
  };

  // FUNCAO PARA REALIZAR LOGOUT
  const logout = () => {
    storeLogout();
    router.push('/login');
  };

  // VERIFICANDO SE O USUARIO ESTA AUTENTICADO
  let isAuthenticated = false;
  if (token) {
    if (user) {
      isAuthenticated = true;
    } else {
      isAuthenticated = false;
    }
  } else {
    isAuthenticated = false;
  }

  // RETORNO DO HOOK
  return {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    logout,
  };
}
