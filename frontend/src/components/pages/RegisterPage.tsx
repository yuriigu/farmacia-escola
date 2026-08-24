'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Pill, Eye, EyeOff, UserPlus, Shield } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function RegisterPage({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', cpf: '', phone: '', birthDate: '', address: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (field === 'cpf') {
      value = value.replace(/\D/g, '').slice(0, 11);
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    if (field === 'phone') {
      value = value.replace(/\D/g, '').slice(0, 11);
      value = value.replace(/^(\d{2})(\d)/, '($1) $2');
      value = value.replace(/(\d{5})(\d)/, '$1-$2');
    }
    setForm({ ...form, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const digitsOnly = (v: string) => v.replace(/\D/g, '');
    const cpfDigits = digitsOnly(form.cpf);
    if (cpfDigits.length !== 11 || /^(.)\1{10}$/.test(cpfDigits)) {
      setError('CPF inválido. Insira um CPF válido com 11 dígitos.');
      setLoading(false);
      return;
    }
    const phoneDigits = digitsOnly(form.phone);
    if (phoneDigits && (phoneDigits.length < 10 || phoneDigits.length > 11)) {
      setError('Telefone inválido. Insira um telefone com DDD (10 ou 11 dígitos).');
      setLoading(false);
      return;
    }

    try {
      const result = await api.register({
        name: form.name,
        email: form.email,
        password: form.password,
        cpf: form.cpf,
        phone: form.phone || undefined,
        birthDate: form.birthDate || undefined,
        address: form.address || undefined,
      });
      setAuth(result.token, result.user);
      toast.success('Cadastro realizado com sucesso!');
    } catch (err: unknown) {
      const error = err as { error?: string };
      setError(error.error || 'Erro ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 px-4 py-10 relative overflow-hidden">
      {/* Animated mesh background blobs */}
      <div className="mesh-blob mesh-blob-1" style={{ top: '-5%', right: '-10%' }} />
      <div className="mesh-blob mesh-blob-2" style={{ bottom: '10%', left: '-5%' }} />
      <div className="mesh-blob mesh-blob-3" style={{ top: '40%', right: '20%' }} />

      {/* Subtle grid overlay */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{
        backgroundImage: 'radial-gradient(circle, oklch(0.6 0.118 184.704) 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }} />

      <div className="w-full max-w-lg p-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-teal-500/5 border border-white/50 dark:border-slate-700/50 animate-fade-in-slide-up relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-18 h-18 rounded-2xl bg-gradient-to-br from-teal-500 via-emerald-500 to-teal-600 text-white mb-4 shadow-xl shadow-teal-500/25">
            <UserPlus className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            <span className="text-slate-800 dark:text-slate-100">Criar Conta</span>{' '}
            <span className="gradient-text-emerald">de Paciente</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Preencha seus dados para se cadastrar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-xl text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Nome completo</Label>
            <Input value={form.name} onChange={handleChange('name')} placeholder="Seu nome completo" required className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 h-11 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">E-mail</Label>
              <Input type="email" value={form.email} onChange={handleChange('email')} placeholder="seu@email.com" required className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 h-11 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">CPF</Label>
              <Input value={form.cpf} onChange={handleChange('cpf')} placeholder="000.000.000-00" required className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 h-11 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Senha</Label>
            <div className="relative">
              <Input type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange('password')} placeholder="Mínimo 6 caracteres" minLength={6} required className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 h-11 pr-12 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors p-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Telefone</Label>
              <Input value={form.phone} onChange={handleChange('phone')} placeholder="(00) 00000-0000" className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 h-11 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Nascimento</Label>
              <Input type="date" value={form.birthDate} onChange={handleChange('birthDate')} className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 h-11 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Endereço</Label>
            <Input value={form.address} onChange={handleChange('address')} placeholder="Rua, número, bairro, cidade" className="rounded-xl border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 h-11 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm" />
          </div>

          <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm active:scale-[0.98] transition-all shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Cadastrando...
              </span>
            ) : 'Criar Conta'}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700/50 text-center text-sm text-slate-500 dark:text-slate-400">
          Já tem conta?{' '}
          <button onClick={onSwitchToLogin} className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-bold hover:underline underline-offset-2">
            Faça login
          </button>
        </div>
      </div>
    </div>
  );
}
