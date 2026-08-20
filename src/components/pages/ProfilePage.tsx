'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  UserRound, Mail, Phone, Lock, Save, Eye, EyeOff,
  Shield, Check, Loader2, Calendar, Building2
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { getAvatarColor } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  FARMACEUTICO: 'Farmacêutico',
  ALUNO: 'Aluno',
  PACIENTE: 'Paciente',
};

export function ProfilePage() {
  const { user, token, setAuth } = useAuthStore();

  const [name] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSaving(true);
    try {
      const updatedUser = await api.updateUser(user.id, { email, phone });
      // Update auth store with new data
      setAuth(token!, {
        ...user,
        email: updatedUser.email,
        phone: updatedUser.phone,
      });
      toast.success('Perfil atualizado com sucesso!');
    } catch (err: unknown) {
      const error = err as { error?: string };
      toast.error(error.error || 'Erro ao atualizar perfil.');
    } finally {
      setSaving(false);
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

  const avatarColor = getAvatarColor(user?.name || 'U');

  return (
    <div className="space-y-6 page-enter">
      {/* Profile Header Card */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 relative">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }} />
        </div>
        <div className="px-6 pb-6 -mt-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className={`w-24 h-24 rounded-2xl ${avatarColor} text-white flex items-center justify-center font-bold text-3xl shadow-xl ring-4 ring-white dark:ring-slate-800 shrink-0`}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0 pt-2">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white truncate">{user?.name || 'Usuário'}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user?.email || ''}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-xs px-2 py-0.5 font-medium">
                  <Shield className="w-3 h-3 mr-1" />
                  {ROLE_LABELS[user?.role || ''] || user?.role}
                </Badge>
                <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Desde {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Info Card */}
        <Card className="glass-card rounded-2xl border-0 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <UserRound className="w-5 h-5 text-emerald-500" />
              Informações Pessoais
            </CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400">Atualize seus dados de contato.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Name (read-only) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <UserRound className="w-4 h-4 text-slate-400" />
                  Nome Completo
                </Label>
                <Input
                  value={name}
                  disabled
                  className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                />
                <p className="text-xs text-slate-400 dark:text-slate-500">O nome não pode ser editado diretamente.</p>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  E-mail
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  Telefone
                </Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Role display */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  Perfil / Papel
                </Label>
                <Input
                  value={ROLE_LABELS[user?.role || ''] || user?.role || ''}
                  disabled
                  className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                />
                <p className="text-xs text-slate-400 dark:text-slate-500">O papel é definido pelo administrador do sistema.</p>
              </div>

              <Separator className="my-4" />

              <Button
                type="submit"
                disabled={saving}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium shadow-lg shadow-emerald-500/20 btn-press"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Alterações
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password Change Card */}
        <Card className="glass-card rounded-2xl border-0 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-500" />
              Alterar Senha
            </CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400">Mantenha sua conta segura atualizando sua senha periodicamente.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSavePassword} className="space-y-4">
              {/* Current Password */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400" />
                  Senha Atual
                </Label>
                <div className="relative">
                  <Input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-emerald-500/20 focus:border-emerald-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400" />
                  Nova Senha
                </Label>
                <div className="relative">
                  <Input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-emerald-500/20 focus:border-emerald-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Check className="w-4 h-4 text-slate-400" />
                  Confirmar Nova Senha
                </Label>
                <div className="relative">
                  <Input
                    type={showNewPw ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    required
                    minLength={6}
                    className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-emerald-500/20 focus:border-emerald-500 pr-10"
                  />
                  {confirmPassword && newPassword && confirmPassword !== newPassword && (
                    <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-rose-500" />
                      As senhas não coincidem
                    </p>
                  )}
                  {confirmPassword && newPassword && confirmPassword === newPassword && (
                    <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      As senhas coincidem
                    </p>
                  )}
                </div>
              </div>

              <Separator className="my-4" />

              {/* Password Requirements */}
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Requisitos da senha</p>
                <div className="space-y-1.5">
                  <PasswordRule fulfilled={newPassword.length >= 6} label="Mínimo 6 caracteres" />
                  <PasswordRule fulfilled={/[A-Z]/.test(newPassword)} label="Pelo menos uma letra maiúscula" />
                  <PasswordRule fulfilled={/[0-9]/.test(newPassword)} label="Pelo menos um número" />
                  <PasswordRule fulfilled={newPassword.length >= 8} label="Recomendado: 8+ caracteres" />
                </div>
              </div>

              <Button
                type="submit"
                disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium shadow-lg shadow-emerald-500/20 btn-press disabled:opacity-50"
              >
                {savingPassword ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                Alterar Senha
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PasswordRule({ fulfilled, label }: { fulfilled: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={`w-1.5 h-1.5 rounded-full transition-colors ${fulfilled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
      <span className={fulfilled ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400 dark:text-slate-500'}>
        {label}
      </span>
    </div>
  );
}
