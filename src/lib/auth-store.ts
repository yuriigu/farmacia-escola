'use client';

import { create } from 'zustand';
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

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  loading: true,

  setAuth: (token: string, user: AuthUser) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
  },

  setLoading: (loading: boolean) => set({ loading }),

  hydrate: () => {
    const token = localStorage.getItem('token');
    const raw = localStorage.getItem('user');
    let user: AuthUser | null = null;
    try {
      user = raw ? JSON.parse(raw) : null;
    } catch { /* ignore */ }
    set({ token, user, loading: false });
  },
}));

// Helper to get user from localStorage (for non-react contexts)
export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
