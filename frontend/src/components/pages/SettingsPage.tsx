'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Settings, UserRound, Palette, Info, Mail, Phone,
  Lock, Save, Eye, EyeOff, Shield, Check, Loader2,
  Calendar, Sun, Moon, Sparkles, Building2, Layers
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { getAvatarColor } from '@/lib/constants';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'perfil';
  const [activeTab, setActiveTab] = useState(initialTab);

  const { theme, setTheme } = useTheme();
  const { user, token, setAuth } = useAuthStore();

  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['perfil', 'aparencia', 'sistema'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.replace(`/configuracoes?tab=${tabId}`);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSavingProfile(true);
    try {
      const updatedUser = await api.updateUser(user.id, { email, phone });
      setAuth(token!, {
        ...user,
        email: updatedUser.email,
      });
      toast.success('Perfil atualizado com sucesso!');
    } catch (err: unknown) {
      const error = err as { error?: string };
      toast.error(error.error || 'Erro ao atualizar perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Preencha todos os campos de senha.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('A nova senha e a confirmação não coincidem.');
      return;
    }

    setSavingPassword(true);
    try {
      await api.updateProfilePassword({
        currentPassword,
        newPassword,
      });
      toast.success('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const error = err as { error?: string };
      toast.error(error.error || 'Erro ao alterar senha. Verifique a senha atual.');
    } finally {
      setSavingPassword(false);
    }
  };

  const tabs = [
    { id: 'perfil', label: 'Meu Perfil & Senha', icon: UserRound },
    { id: 'aparencia', label: 'Aparência & Tema', icon: Palette },
    { id: 'sistema', label: 'Sistema & Informações', icon: Info },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto page-enter">
      {/* Page Header */}
      <PageHeader
        title="Configurações & Perfil"
        description="Gerencie seus dados de acesso, preferências visuais e informações da conta."
        icon={Settings}
      />

      {/* Unified Tab Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================== TAB 1: PERFIL ==================== */}
      {activeTab === 'perfil' && (
        <div className="space-y-6">
          {/* User Profile Header Card */}
          <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="h-20 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 relative">
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }}
              />
            </div>
            <div className="px-6 pb-6 -mt-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                <div
                  className={`w-20 h-20 rounded-2xl ${getAvatarColor(
                    user?.name || 'U'
                  )} text-white flex items-center justify-center font-bold text-2xl shadow-lg ring-4 ring-white dark:ring-slate-800 shrink-0`}
                >
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0 pt-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white truncate">
                      {user?.name || 'Usuário'}
                    </h2>
                    <RoleBadge role={user?.role} />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{user?.email || ''}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Contact Info Card */}
            <Card className="rounded-2xl border border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                  <UserRound className="w-5 h-5 text-emerald-600" />
                  Informações de Contato
                </CardTitle>
                <CardDescription>Atualize seu e-mail e telefone de cadastro.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Nome Completo
                    </Label>
                    <Input
                      value={user?.name || ''}
                      disabled
                      className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed rounded-xl text-xs"
                    />
                    <p className="text-[11px] text-slate-400">O nome deve ser alterado por um administrador.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      E-mail de Acesso *
                    </Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                      className="rounded-xl border-slate-200 dark:border-slate-700 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Telefone / WhatsApp
                    </Label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="rounded-xl border-slate-200 dark:border-slate-700 text-xs"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={savingProfile}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs gap-2"
                  >
                    {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar Dados de Contato
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Change Password Card */}
            <Card className="rounded-2xl border border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                  <Lock className="w-5 h-5 text-emerald-600" />
                  Segurança & Senha
                </CardTitle>
                <CardDescription>Altere sua senha de acesso periodicamente.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSavePassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Senha Atual *
                    </Label>
                    <div className="relative">
                      <Input
                        type={showCurrentPw ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="pr-9 rounded-xl border-slate-200 dark:border-slate-700 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPw(!showCurrentPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showCurrentPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Nova Senha * (mínimo 6 caracteres)
                    </Label>
                    <div className="relative">
                      <Input
                        type={showNewPw ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="pr-9 rounded-xl border-slate-200 dark:border-slate-700 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(!showNewPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Confirmar Nova Senha *
                    </Label>
                    <Input
                      type={showNewPw ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      required
                      minLength={6}
                      className="rounded-xl border-slate-200 dark:border-slate-700 text-xs"
                    />
                    {confirmPassword && newPassword && confirmPassword !== newPassword && (
                      <p className="text-xs text-rose-500 font-medium">As senhas não coincidem.</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs gap-2"
                  >
                    {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    Alterar Senha
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: APARÊNCIA ==================== */}
      {activeTab === 'aparencia' && (
        <div className="space-y-6">
          <Card className="rounded-2xl border border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Palette className="w-5 h-5 text-emerald-600" />
                Tema e Aparência Visual
              </CardTitle>
              <CardDescription>Escolha entre o modo claro e o modo escuro para a interface.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setTheme('light')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    theme === 'light'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-xl bg-amber-100 text-amber-600">
                      <Sun className="w-5 h-5" />
                    </div>
                    {theme === 'light' && <Check className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Tema Claro</h4>
                  <p className="text-xs text-slate-500 mt-1">Visual claro com alto contraste, ideal para ambientes iluminados.</p>
                </div>

                <div
                  onClick={() => setTheme('dark')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    theme === 'dark'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600">
                      <Moon className="w-5 h-5" />
                    </div>
                    {theme === 'dark' && <Check className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Tema Escuro</h4>
                  <p className="text-xs text-slate-500 mt-1">Conforto visual para ambientes com pouca luz e economia de energia.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== TAB 3: SISTEMA ==================== */}
      {activeTab === 'sistema' && (
        <div className="space-y-6">
          <Card className="rounded-2xl border border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                Informações da Farmácia Escola
              </CardTitle>
              <CardDescription>Dados operacionais e de conformidade do sistema integrado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Instituição</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Universidade / Farmácia Escola</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Módulo de Estoque</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Gestão por Lotes e Validade FEFO</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Versão do Sistema</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">v2.4.0 (Padronizada)</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Fuso Horário e Localidade</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">pt-BR (Formato 24h: HH:mm)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}