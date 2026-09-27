'use client';

// imports de bibliotecas
import { useRouter } from 'next/navigation';

// imports locais
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/services/api';

// hook de autenticacao. encapsula a store de auth e expoe uma
// api mais ergonomica pra telas e componentes: user, token,
// loading, isauthenticated e as acoes de login/logout.
// a store fica como fonte da verdade (persistencia do token,
// hidratacao), e o hook so orquestra as acoes com a navegacao
// (logout manda pro login) e com o cliente http.
export function useAuth() {
  // estado global de autenticacao vindo da store.
  const { user, token, loading, setAuth, logout: storeLogout } = useAuthStore();
  const router = useRouter();

  // login: chama a api, guarda a sessao na store e devolve o
  // resultado (token + user) pra quem consumiu o hook precisar.
  const login = async (email: string, pass: string) => {
    const data = await api.auth.login(email, pass);
    setAuth(data.token, data.user);
    return data;
  };

  // logout: limpa a sessao na store e manda pro login.
  // a navegacao fica aqui porque o logout sempre implica sair da
  // tela atual.
  const logout = () => {
    storeLogout();
    router.push('/login');
  };

  // flag booleana que resume "tem token e tem user". serve pra
  // condicional em render (ex: mostrar menu logado).
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

  // retorno do hook. inclui o estado (user, token, loading,
  // isauthenticated) e as acoes (login, logout).
  return {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    logout,
  };
}