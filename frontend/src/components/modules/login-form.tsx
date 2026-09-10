'use client';

// IMPORTS DO REACT
import React, { useState } from 'react';

// IMPORTS LOCAIS
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// INTERFACE DAS PROPRIEDADES DO FORMULARIO DE LOGIN
interface LoginFormProps {
  onSubmit?: (data: { email: string; password: string }) => Promise<void> | void;
  isLoading?: boolean;
}

// COMPONENTE DO FORMULARIO DE LOGIN
export function LoginForm({ onSubmit, isLoading = false }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // FUNCAO PARA ENVIAR O FORMULARIO DE LOGIN
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // VALIDANDO SE O EMAIL ESTA PREENCHIDO
    if (!email) {
      setError('Preencha todos os campos');
      return;
    }

    // VALIDANDO SE A SENHA ESTA PREENCHIDA
    if (!password) {
      setError('Preencha todos os campos');
      return;
    }

    try {
      if (onSubmit) {
        await onSubmit({ email, password });
      }
    } catch (err: any) {
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

  // MENSAGEM DE ERRO VISIVEL
  let errorMessageBlock: React.ReactNode = null;
  if (error) {
    errorMessageBlock = (
      <div className="p-3 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg" role="alert">
        {error}
      </div>
    );
  }

  // TEXTO DO BOTAO DE SUBMISSAO
  let buttonLabel = 'Entrar';
  if (isLoading) {
    buttonLabel = 'Entrando...';
  } else {
    buttonLabel = 'Entrar';
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm w-full mx-auto" data-testid="login-form">
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
          }}
          required
        />
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
          }}
          required
        />
      </div>
      <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isLoading}>
        {buttonLabel}
      </Button>
    </form>
  );
}
