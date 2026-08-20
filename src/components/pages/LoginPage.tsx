'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Pill, Eye, EyeOff, Shield } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginPage({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api.login(email, password);
      setAuth(result.token, result.user);
      toast.success('Login realizado com sucesso!');
    } catch (err: unknown) {
      const error = err as { error?: string };
      setError(error.error || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 px-4 relative overflow-hidden">
      {/* Animated mesh background blobs */}
      <div className="mesh-blob mesh-blob-1" style={{ top: '-10%', left: '-5%' }} />
      <div className="mesh-blob mesh-blob-2" style={{ top: '50%', right: '-10%' }} />
      <div className="mesh-blob mesh-blob-3" style={{ bottom: '-5%', left: '30%' }} />

      {/* Subtle grid overlay */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{
        backgroundImage: 'radial-gradient(circle, oklch(0.696 0.17 162) 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }} />

      <div className="w-full max-w-md p-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-emerald-500/5 border border-white/50 dark:border-slate-700/50 animate-fade-in-slide-up relative z-10">
        {/* Logo section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 text-white mb-4 shadow-xl shadow-emerald-500/25">
            <Pill className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="text-slate-800 dark:text-slate-100">Farmácia</span>{' '}
            <span className="gradient-text-emerald">Escola</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Sistema de Gestão Farmacêutica</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-xl text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">E-mail</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 h-12 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Senha</Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 h-12 pr-12 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors p-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm active:scale-[0.98] transition-all shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30 relative overflow-hidden">
            <span className="relative z-10">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : 'Entrar no Sistema'}
            </span>
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700/50 text-center text-sm text-slate-500 dark:text-slate-400">
          Não tem conta?{' '}
          <button onClick={onSwitchToRegister} className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-bold hover:underline underline-offset-2">
            Cadastre-se aqui
          </button>
        </div>
      </div>
    </div>
  );
}
