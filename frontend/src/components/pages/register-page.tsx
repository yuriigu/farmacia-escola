'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast-handler';
import { Eye, EyeOff, UserPlus, Shield } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { isValidCPF, maskCPF, maskPhone, onlyDigits } from '@/lib/masks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/ui/field-error';

// pagina de cadastro publico de paciente. cuida do formulario,
// da mascara de cpf e telefone, da validacao minima no cliente e
// do submit pra api. ao sucesso, o paciente ja sai autenticado
// (a api devolve token no cadastro).
export function RegisterPage({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', cpf: '', phone: '', birthDate: '', address: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ cpf?: string; phone?: string }>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  // handler generico dos campos. aplica mascara de cpf e telefone
  // enquanto o usuario digita; pros outros campos, so repassa o valor.
  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (field === 'cpf') {
      value = maskCPF(value);
    }
    if (field === 'phone') {
      value = maskPhone(value);
    }
    setForm({ ...form, [field]: value });
    if (field === 'cpf' || field === 'phone') {
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  // submit do cadastro. valida cpf (11 digitos e nao repetido) e
  // telefone (10 ou 11 digitos) antes de chamar a api. o resto da
  // validacao (email, nome, senha) ja vem do zod no backend.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // valida cpf: precisa ter 11 digitos e nao pode ser tudo igual
    // (ex: 11111111111).
    if (!isValidCPF(form.cpf)) {
      setFieldErrors({ cpf: 'CPF inválido. Insira um CPF válido com 11 dígitos.' });
      document.getElementById('register-cpf')?.focus();
      return;
    }

    // valida telefone quando veio preenchido: 10 ou 11 digitos
    // (com ddd).
    const phoneDigits = onlyDigits(form.phone);
    if (phoneDigits) {
      let isPhoneInvalid = false;
      if (phoneDigits.length < 10) {
        isPhoneInvalid = true;
      } else if (phoneDigits.length > 11) {
        isPhoneInvalid = true;
      }

      if (isPhoneInvalid) {
        setFieldErrors({ phone: 'Telefone inválido. Insira um telefone com DDD (10 ou 11 dígitos).' });
        document.getElementById('register-phone')?.focus();
        return;
      }
    }

    setLoading(true);
    try {
      // opcionais viram undefined quando vazios, pra nao sujar o payload.
      let phoneVal: string | undefined = undefined;
      if (form.phone) {
        phoneVal = form.phone;
      }

      let birthDateVal: string | undefined = undefined;
      if (form.birthDate) {
        birthDateVal = form.birthDate;
      }

      let addressVal: string | undefined = undefined;
      if (form.address) {
        addressVal = form.address;
      }

      // aqui chamamos o cliente http (/lib/api) pra criar o usuario
      // e o cadastro de paciente numa transacao no backend. a
      // resposta ja vem com token, entao o paciente sai logado.
      const result = await api.register({
        name: form.name,
        email: form.email,
        password: form.password,
        cpf: form.cpf,
        phone: phoneVal,
        birthDate: birthDateVal,
        address: addressVal,
      });
      setAuth(result.token, result.user);
      router.push('/dashboard');
      router.refresh();
      toast.success('Cadastro realizado com sucesso!');
    } catch (err: unknown) {
      // o erro da api e exibido no bloco de erro do formulario.
      setError(err instanceof Error ? err.message : 'Erro ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 px-4 py-10 relative overflow-hidden">
      {/* blobs decorativos de fundo (mesh) */}
      <div className="mesh-blob mesh-blob-1" style={{ top: '-5%', right: '-10%' }} />
      <div className="mesh-blob mesh-blob-2" style={{ bottom: '10%', left: '-5%' }} />
      <div className="mesh-blob mesh-blob-3" style={{ top: '40%', right: '20%' }} />

      {/* grade sutil por cima do fundo */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{
        backgroundImage: 'radial-gradient(circle, oklch(0.6 0.118 184.704) 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }} />

      <div className="w-full max-w-lg p-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-teal-500/5 border border-white/50 dark:border-slate-700/50 animate-fade-in-slide-up relative z-10">
        {/* logo e titulo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-18 h-18 rounded-2xl bg-linear-to-br from-teal-500 via-emerald-500 to-teal-600 text-white mb-4 shadow-xl shadow-teal-500/25">
            <UserPlus className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            <span className="text-slate-800 dark:text-slate-100">Criar Conta</span>{' '}
            <span className="gradient-text-emerald">de Paciente</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Preencha seus dados para se cadastrar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* bloco de erro, so aparece quando ha mensagem */}
          {(() => {
            if (error) {
              return (
                <div role="alert" className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-xl text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              );
            }
            return null;
          })()}

          {/* nome completo */}
          <div className="space-y-1.5">
            <Label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Nome completo</Label>
            <Input value={form.name} onChange={handleChange('name')} placeholder="Seu nome completo" required className="rounded-xl border-slate-200 dark:border-slate-600 h-11 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm" />
          </div>

          {/* email e cpf lado a lado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">E-mail</Label>
              <Input type="email" value={form.email} onChange={handleChange('email')} placeholder="seu@email.com" required className="rounded-xl border-slate-200 dark:border-slate-600 h-11 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="register-cpf" className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">CPF</Label>
              <Input id="register-cpf" value={form.cpf} onChange={handleChange('cpf')} placeholder="000.000.000-00" aria-invalid={!!fieldErrors.cpf} aria-describedby={fieldErrors.cpf ? 'register-cpf-error' : undefined} className={`rounded-xl border-slate-200 dark:border-slate-600 h-11 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm ${fieldErrors.cpf ? 'border-rose-500' : ''}`} />
              {fieldErrors.cpf && <FieldError id="register-cpf-error" message={fieldErrors.cpf} />}
            </div>
          </div>

          {/* senha com toggle de mostrar/ocultar */}
          <div className="space-y-1.5">
            <Label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Senha</Label>
            <div className="relative">
              {(() => {
                let passType = 'password';
                if (showPassword) {
                  passType = 'text';
                }
                return (
                  <Input
                    type={passType}
                    value={form.password}
                    onChange={handleChange('password')}
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                    className="rounded-xl border-slate-200 dark:border-slate-600 h-11 pr-12 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm"
                  />
                );
              })()}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
              >
                {(() => {
                  if (showPassword) {
                    return <EyeOff className="w-4 h-4" />;
                  }
                  return <Eye className="w-4 h-4" />;
                })()}
              </Button>
            </div>
          </div>

          {/* telefone e data de nascimento lado a lado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Telefone</Label>
              <Input id="register-phone" value={form.phone} onChange={handleChange('phone')} placeholder="(00) 00000-0000" aria-invalid={!!fieldErrors.phone} aria-describedby={fieldErrors.phone ? 'register-phone-error' : undefined} className={`rounded-xl border-slate-200 dark:border-slate-600 h-11 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm ${fieldErrors.phone ? 'border-rose-500' : ''}`} />
              {fieldErrors.phone && <FieldError id="register-phone-error" message={fieldErrors.phone} />}
            </div>
            <div className="space-y-1.5">
              <Label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Nascimento</Label>
              <Input type="date" value={form.birthDate} onChange={handleChange('birthDate')} className="rounded-xl border-slate-200 dark:border-slate-600 h-11 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm" />
            </div>
          </div>

          {/* endereco completo */}
          <div className="space-y-1.5">
            <Label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Endereço</Label>
            <Input value={form.address} onChange={handleChange('address')} placeholder="Rua, número, bairro, cidade" className="rounded-xl border-slate-200 dark:border-slate-600 h-11 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm" />
          </div>

          {/* botao de submit com spinner durante o cadastro */}
          <Button type="submit" disabled={loading} variant="gradient" size="lg" className="w-full">
            {(() => {
              if (loading) {
                return (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Cadastrando...
                  </span>
                );
              }
              return 'Criar Conta';
            })()}
          </Button>
        </form>

        {/* rodape com atalho pro login */}
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