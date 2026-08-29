import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '@/lib/auth-store';
import { mockUser } from '../../fixtures/user.fixture';

describe('useAuthStore Hook', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null, loading: false });
    localStorage.clear();
  });

  it('deve inicializar com estado limpo', () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('deve autenticar usuário com setAuth', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setAuth('jwt-token-123', mockUser);
    });

    expect(result.current.token).toBe('jwt-token-123');
    expect(result.current.user).toEqual(mockUser);
    expect(localStorage.getItem('token')).toBe('jwt-token-123');
  });

  it('deve desautenticar com logout', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setAuth('jwt-token-123', mockUser);
    });

    expect(result.current.user).not.toBeNull();

    act(() => {
      result.current.logout();
    });

    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });
});
