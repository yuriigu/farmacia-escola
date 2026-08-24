'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pill, Eye, EyeOff, Shield, LogIn } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(4, 'A senha deve ter pelo menos 4 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage({ onSwitchToRegister }: { onSwitchToRegister?: () => void }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      return await api.auth.login(data.email, data.password);
    },
    onSuccess: (result) => {
      setAuth(result.token, result.user);
      toast.success(`Bem-vindo(a), ${result.user.name}!`);
      router.push('/dashboard');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao realizar login. Verifique suas credenciais.');
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 px-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="mesh-blob mesh-blob-1" style={{ top: '-10%', left: '-5%' }} />
      <div className="mesh-blob mesh-blob-2" style={{ top: '50%', right: '-10%' }} />
      <div className="mesh-blob mesh-blob-3" style={{ bottom: '-5%', left: '30%' }} />

      <div className="w-full max-w-md p-8 bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-emerald-500/5 border border-white/60 dark:border-slate-700/60 animate-fade-in-slide-up relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 text-white mb-4 shadow-xl shadow-emerald-500/25">
            <Pill className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="text-slate-800 dark:text-slate-100">Farmácia</span>{' '}
            <span className="gradient-text-emerald">Escola</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Sistema de Gestão Farmacêutica Universitária</p>
        </div>

        {/* Error banner */}
        {loginMutation.isError && (
          <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-sm flex items-center gap-2.5">
            <Shield className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{loginMutation.error?.message || 'Falha na autenticação'}</span>
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              {...register('email')}
              className={`rounded-xl h-11 transition-all ${
                errors.email ? 'border-rose-500 focus:ring-rose-500/20' : 'focus:border-emerald-500 focus:ring-emerald-500/20'
              }`}
            />
            {errors.email && (
              <p className="text-xs text-rose-500 font-medium">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Senha
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password')}
                className={`rounded-xl h-11 pr-11 transition-all ${
                  errors.password ? 'border-rose-500 focus:ring-rose-500/20' : 'focus:border-emerald-500 focus:ring-emerald-500/20'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors p-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-rose-500 font-medium">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all active:scale-[0.98] mt-2"
          >
            {loginMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Entrando...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" />
                Entrar no Sistema
              </span>
            )}
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-700/50 text-center text-sm text-slate-500 dark:text-slate-400">
          Não tem conta de paciente?{' '}
          <button
            onClick={() => {
              if (onSwitchToRegister) {
                onSwitchToRegister();
              } else {
                router.push('/register');
              }
            }}
            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-bold hover:underline underline-offset-2"
          >
            Cadastre-se aqui
          </button>
        </div>
      </div>
    </div>
  );
}
