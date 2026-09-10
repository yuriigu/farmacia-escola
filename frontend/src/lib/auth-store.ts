'use client';

// IMPORTS DE BIBLIOTECAS
import { create } from 'zustand';
import Cookies from 'js-cookie';

// IMPORTS LOCAIS
import type { AuthUser } from './types';

// INTERFACE DO ESTADO DE AUTENTICACAO
interface AuthState {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  hydrate: () => void;
}

// FUNCAO AUXILIAR PARA DEFINIR COOKIES
function setAuthCookies(token: string, user: AuthUser) {
  Cookies.set('auth_token', token, { expires: 7, path: '/', sameSite: 'lax' });
  Cookies.set('user_role', user.role, { expires: 7, path: '/', sameSite: 'lax' });
  Cookies.set('user_info', JSON.stringify(user), { expires: 7, path: '/', sameSite: 'lax' });
}

// FUNCAO AUXILIAR PARA LIMPAR COOKIES
function clearAuthCookies() {
  Cookies.remove('auth_token', { path: '/' });
  Cookies.remove('user_role', { path: '/' });
  Cookies.remove('user_info', { path: '/' });
}

// STORE ZUSTAND DE AUTENTICACAO
export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  loading: true,

  // DEFINIR AUTENTICACAO
  setAuth: (token: string, user: AuthUser) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    setAuthCookies(token, user);
    set({ token: token, user: user, loading: false });
  },

  // REALIZAR LOGOUT
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    clearAuthCookies();
    set({ token: null, user: null, loading: false });
  },

  // DEFINIR ESTADO DE CARREGAMENTO
  setLoading: (loading: boolean) => {
    set({ loading: loading });
  },

  // HIDRATAR ESTADO DE AUTENTICACAO
  hydrate: () => {
    // OBTENDO TOKEN DO COOKIE
    let token: string | null = null;
    const cookieToken = Cookies.get('auth_token');
    if (cookieToken) {
      token = cookieToken;
    } else {
      token = null;
    }

    // OBTENDO USUARIO DO COOKIE
    let userStr: string | null = null;
    const cookieUserStr = Cookies.get('user_info');
    if (cookieUserStr) {
      userStr = cookieUserStr;
    } else {
      userStr = null;
    }

    // VERIFICANDO NO LOCALSTORAGE CASO ESTEJA NO BROWSER
    if (typeof window !== 'undefined') {
      if (!token) {
        token = localStorage.getItem('token');
      }
      if (!userStr) {
        userStr = localStorage.getItem('user');
      }
    }

    // FAZENDO PARSE DO USUARIO
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

    // ATUALIZANDO COOKIES SE AMBOS ESTIVEREM PRESENTES
    if (token) {
      if (user) {
        setAuthCookies(token, user);
      }
    }

    set({ token: token, user: user, loading: false });
  },
}));

// FUNCAO PARA RECUPERAR USUARIO DO ARMAZENAMENTO
function getStoredUser(): AuthUser | null {
  const cookieUser = Cookies.get('user_info');
  if (cookieUser) {
    try {
      const parsed = JSON.parse(cookieUser);
      return parsed;
    } catch {
      // IGNORA ERRO DE PARSE
    }
  }

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem('user');
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw);
      return parsed;
    } catch {
      return null;
    }
  }
  return null;
}