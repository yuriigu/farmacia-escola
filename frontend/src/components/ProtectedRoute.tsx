import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { api } from '../lib/api';

// Cache em nível de módulo: evita revalidar o mesmo token a cada remontagem.
let validatedToken = '';

type ValidationStatus = 'loading' | 'valid' | 'invalid';

export function ProtectedRoute() {
  const token = localStorage.getItem('token');

  const [status, setStatus] = useState<ValidationStatus>(() =>
    token ? 'loading' : 'invalid'
  );

  useEffect(() => {
    // Sem token: sem autenticação possível.
    if (!token) {
      setStatus('invalid');
      return;
    }

    // Reutiliza o resultado se o token já foi validado nesta sessão.
    if (validatedToken === token) {
      setStatus('valid');
      return;
    }

    let cancelled = false;

    api
      .get('/auth/me')
      .then(() => {
        if (cancelled) return;
        validatedToken = token;
        setStatus('valid');
      })
      .catch(() => {
        if (cancelled) return;
        // Token inválido/expirado: remove e exige login novamente.
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        validatedToken = '';
        setStatus('invalid');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        Verificando sessão...
      </div>
    );
  }

  if (!token || status === 'invalid') {
    return <Navigate to="/login" replace />;
  }

    return <Outlet />;
}

// Retorna o usuário autenticado armazenado no localStorage.
export function getStoredUser(): { id: number; name: string; email: string; role?: string; active?: boolean } | null {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

interface RequireRoleProps {
  allowed: string[];
  children: JSX.Element;
}

// Garante que o usuário autenticado possua um dos perfis permitidos.
// O backend também valida o role via roleMiddleware, mas este guarda evita
// que a rota seja renderizada desnecessariamente para perfis não autorizados.
export function RequireRole({ allowed, children }: RequireRoleProps) {
  const user = getStoredUser();
  const role = user?.role;

  if (!role || (allowed.length > 0 && !allowed.includes(role))) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
