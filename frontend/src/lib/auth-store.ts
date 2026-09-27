'use client';

// imports de bibliotecas
import { create } from 'zustand';
import Cookies from 'js-cookie';

// imports locais
import type { AuthUser } from '@/types';

// interface do estado de autenticacao da store. guarda o token, o
// usuario e o flag de loading (usado durante a hidratacao). expoe
// as acoes de setauth, logout, setloading e hydrate.
interface AuthState {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  setAuth: (_token: string, _user: AuthUser) => void;
  logout: () => void;
  setLoading: (_loading: boolean) => void;
  hydrate: () => void;
}

// monta as opcoes dos cookies de auth. o principal aqui e o flag
// secure, que so e ativado quando a pagina esta em https. isso
// impede que o token trafegue em conexao sem tls em producao,
// sem atrapalhar o desenvolvimento local (http continua ok).
function buildCookieOptions() {
  let isSecure = false;
  if (typeof window !== 'undefined') {
    isSecure = window.location.protocol === 'https:';
  }
  return {
    expires: 7,
    path: '/',
    sameSite: 'lax' as const,
    secure: isSecure,
  };
}

// grava os tres cookies usados pela auth: o token, o papel do
// usuario e o objeto do usuario serializado. o role e o user_info
// ficam em cookies separados pra o middleware do next conseguir
// ler o papel sem desserializar o usuario inteiro.
function setAuthCookies(token: string, user: AuthUser) {
  const options = buildCookieOptions();
  Cookies.set('auth_token', token, options);
  Cookies.set('user_role', user.role, options);
  Cookies.set('user_info', JSON.stringify(user), options);
}

// limpa os tres cookies de auth. o path precisa bater com o usado
// na escrita, senao o remove nao encontra.
function clearAuthCookies() {
  Cookies.remove('auth_token', { path: '/' });
  Cookies.remove('user_role', { path: '/' });
  Cookies.remove('user_info', { path: '/' });
}

// store zustand de autenticacao. e a fonte da verdade pro estado
// de sessao no client. a persistencia e dupla de proposito: cookie
// (pra middleware e ssr do next conseguir ler) e localstorage (pra
// hidratacao rapida no client sem depender do cookie).
// o loading comeca true e vira false depois da hidratacao, o que
// evita render prematuro da tela "acesso negado" em rotas protegidas.
export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  loading: true,

  // define a autenticacao. grava no localstorage (quando no
  // browser) e nos cookies, e atualiza o estado da store.
  // o loading vira false junto porque a sessao ja esta definida.
  setAuth: (token: string, user: AuthUser) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    setAuthCookies(token, user);
    set({ token: token, user: user, loading: false });
  },

  // logout. limpa localstorage, cookies e zera o estado da store.
  // o loading fica false porque nao ha mais nada a hidratar.
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    clearAuthCookies();
    set({ token: null, user: null, loading: false });
  },

  // atualiza o flag de loading. usado durante a hidratacao.
  setLoading: (loading: boolean) => {
    set({ loading: loading });
  },

  // hidrata o estado de autenticacao a partir dos cookies e, se
  // preciso, do localstorage. a ordem de prioridade e: cookie
  // primeiro (pra bater com o que o middleware do next leu),
  // localstorage como fallback. no fim, regrava os cookies quando
  // conseguiu resolver token + user, garantindo que tudo esteja
  // sincronizado.
  hydrate: () => {
    // tenta pegar o token do cookie.
    let token: string | null = null;
    const cookieToken = Cookies.get('auth_token');
    if (cookieToken) {
      token = cookieToken;
    } else {
      token = null;
    }

    // tenta pegar o usuario do cookie.
    let userStr: string | null = null;
    const cookieUserStr = Cookies.get('user_info');
    if (cookieUserStr) {
      userStr = cookieUserStr;
    } else {
      userStr = null;
    }

    // se ainda faltar algum dos dois e estiver no browser, tenta
    // o localstorage como fallback.
    if (typeof window !== 'undefined') {
      if (!token) {
        token = localStorage.getItem('token');
      }
      if (!userStr) {
        userStr = localStorage.getItem('user');
      }
    }

    // faz o parse do usuario com try/catch pra nao derrubar a
    // hidratacao se o json estiver corrompido.
    let user: AuthUser | null = null;
    try {
      if (userStr) {
        user = JSON.parse(userStr);
      } else {
        user = null;
      }
    } catch {
      user = null;
    }

    // se tem token e user, regrava os cookies. isso cobre o caso
    // do token ter vindo do localstorage (cookie expirado).
    if (token) {
      if (user) {
        setAuthCookies(token, user);
      }
    }

    set({ token: token, user: user, loading: false });
  },
}));