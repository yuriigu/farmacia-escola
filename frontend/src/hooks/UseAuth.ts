'use client';

import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/services/api';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const { user, token, loading, setAuth, logout: storeLogout } = useAuthStore();
  const router = useRouter();

  const login = async (email: string, pass: string) => {
    const data = await api.auth.login(email, pass);
    setAuth(data.token, data.user);
    return data;
  };

  const logout = () => {
    storeLogout();
    router.push('/login');
  };

  return {
    user,
    token,
    loading,
    isAuthenticated: Boolean(token && user),
    login,
    logout,
  };
}
