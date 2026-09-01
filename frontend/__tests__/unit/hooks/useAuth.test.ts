import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/hooks/UseAuth';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/services/api';
import { mockUser } from '../../fixtures/user.fixture';

vi.mock('@/services/api', () => ({
  api: {
    auth: {
      login: vi.fn(),
    },
  },
}));

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: null, user: null, loading: false });
    localStorage.clear();
  });

  it('deve inicializar como não autenticado', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('deve fazer login com sucesso e atualizar estado', async () => {
    (api.auth.login as any).mockResolvedValue({
      token: 'jwt-auth-token-123',
      user: mockUser,
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const response = await result.current.login('admin@farmacia.ufba.br', 'senha123');
      expect(response.token).toBe('jwt-auth-token-123');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe('jwt-auth-token-123');
  });

  it('deve fazer logout e limpar estado de autenticação', async () => {
    useAuthStore.setState({ token: 'jwt-token', user: mockUser, loading: false });

    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
  });
});
