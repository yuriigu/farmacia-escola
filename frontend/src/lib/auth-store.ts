'use client';

import { create } from 'zustand';
import Cookies from 'js-cookie';
import type { AuthUser } from './types';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  hydrate: () => void;
}

function setAuthCookies(token: string, user: AuthUser) {
  Cookies.set('auth_token', token, { expires: 7, path: '/', sameSite: 'lax' });
  Cookies.set('user_role', user.role, { expires: 7, path: '/', sameSite: 'lax' });
  Cookies.set('user_info', JSON.stringify(user), { expires: 7, path: '/', sameSite: 'lax' });
}

function clearAuthCookies() {
  Cookies.remove('auth_token', { path: '/' });
  Cookies.remove('user_role', { path: '/' });
  Cookies.remove('user_info', { path: '/' });
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  loading: true,

  setAuth: (token: string, user: AuthUser) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    setAuthCookies(token, user);
    set({ token, user, loading: false });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    clearAuthCookies();
    set({ token: null, user: null, loading: false });
  },

  setLoading: (loading: boolean) => set({ loading }),

  hydrate: () => {
    let token = Cookies.get('auth_token') || null;
    let userStr = Cookies.get('user_info') || null;

    if (typeof window !== 'undefined') {
      if (!token) token = localStorage.getItem('token');
      if (!userStr) userStr = localStorage.getItem('user');
    }

    let user: AuthUser | null = null;
    try {
      user = userStr ? JSON.parse(userStr) : null;
    } catch {
      user = null;
    }

    if (token && user) {
      setAuthCookies(token, user);
    }

    set({ token, user, loading: false });
  },
}));

// Helper to get user from localStorage or cookie
function getStoredUser(): AuthUser | null {
  const cookieUser = Cookies.get('user_info');
  if (cookieUser) {
    try {
      return JSON.parse(cookieUser);
    } catch { /* ignore */ }
  }

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}