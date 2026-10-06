'use client';

// imports do react
import React, { useState } from 'react';

// imports locais
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/ui/field-error';

// props do formulario de login. o onsubmit e opcional porque o
// componente pode ser usado so como apresentacao (sem logica) em
// testes ou em telas que orquestram o login por fora.
interface LoginFormProps {
  onSubmit?: (data: { email: string; password: string }) => Promise<void> | void;
  isLoading?: boolean;
}

// formulario de login. cuida do estado dos campos, da validacao
// simples de "campos obrigatorios", do estado de erro e do botao
// de submit. a logica real de autenticar fica no onsubmit, que e
// passado pelo componente pai.
export function LoginForm({ onSubmit, isLoading = false }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  // submit do formulario. valida presenca de email e senha, limpa o
  // erro anterior e chama o onsubmit. se o onsubmit lancar, captura
  // a mensagem e mostra no bloco de erro.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // valida se o email foi preenchido.
    if (!email) {
      setFieldErrors({ email: 'Informe o e-mail.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldErrors({ email: 'Informe um e-mail válido.' });
      return;
    }

    // valida se a senha foi preenchida.
    if (!password) {
      setFieldErrors({ password: 'Informe a senha.' });
      return;
    }

    try {
      if (onSubmit) {
        await onSubmit({ email, password });
      }
    } catch (err: any) {
      // fallback de mensagem quando o erro nao traz um texto proprio.
      let errorMessage = 'Erro ao realizar login';
      if (err) {
        if (err.message) {
          errorMessage = err.message;
        } else {
          errorMessage = 'Erro ao realizar login';
        }
      } else {
        errorMessage = 'Erro ao realizar login';
      }
      setError(errorMessage);
    }
  };

  // bloco de erro, renderizado acima dos campos quando ha mensagem.
  // o role='alert' faz leitores de tela anunciarem a mensagem.
  let errorMessageBlock: React.ReactNode = null;
  if (error) {
    errorMessageBlock = (
      <div className="p-3 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg" role="alert">
        {error}
      </div>
    );
  }

  // texto do botao muda conforme o estado de carregamento.
  let buttonLabel = 'Entrar';
  if (isLoading) {
    buttonLabel = 'Entrando...';
  } else {
    buttonLabel = 'Entrar';
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 max-w-sm w-full mx-auto" data-testid="login-form">
      {errorMessageBlock}
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu.email@ufba.br"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setFieldErrors((current) => ({ ...current, email: undefined }));
          }}
          aria-invalid={!!fieldErrors.email}
          aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
        />
        {fieldErrors.email && <FieldError id="login-email-error" message={fieldErrors.email} />}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setFieldErrors((current) => ({ ...current, password: undefined }));
          }}
          aria-invalid={!!fieldErrors.password}
          aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
        />
        {fieldErrors.password && <FieldError id="login-password-error" message={fieldErrors.password} />}
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {buttonLabel}
      </Button>
    </form>
  );
}