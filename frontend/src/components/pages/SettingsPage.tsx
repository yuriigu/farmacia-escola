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
import { useAuthStore } from '@/lib/AuthStore';
import { api } from '@/lib/Api';
import { getAvatarColor } from '@/lib/Constants';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Separator } from '@/components/ui/Separator';

export function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  let initialTab = 'perfil';
  if (tabParam) {
    initialTab = tabParam;
  }
  const [activeTab, setActiveTab] = useState(initialTab);

  const { theme, setTheme } = useTheme();
  const { user, token, setAuth } = useAuthStore();

  let initialEmail = '';
  if (user) {
    if (user.email) {
      initialEmail = user.email;
    }
  }
  const [email, setEmail] = useState(initialEmail);
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
    if (tab) {
      if (['perfil', 'aparencia', 'sistema'].includes(tab)) {
        setTimeout(() => {
          setActiveTab(tab);
        }, 0);
      }
    }
  }, [searchParams]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.replace(`/configuracoes?tab=${tabId}`);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!user.id) return;

    setSavingProfile(true);
    try {
      const updatedUser = await api.updateUser(user.id, { email, phone });
      let authToken = '';
      if (token) {
        authToken = token;
      }
      setAuth(authToken, {
        ...user,
        email: updatedUser.email,
      });
      toast.success('Perfil atualizado com sucesso!');
    } catch (err: unknown) {
      const error = err as { error?: string };
      let errorMsg = 'Erro ao atualizar perfil.';
      if (error) {
        if (error.error) {
          errorMsg = error.error;
        }
      }
      toast.error(errorMsg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Preencha todos os campos de senha.');
      return;
    }
    if (!newPassword) {
      toast.error('Preencha todos os campos de senha.');
      return;
    }
    if (!confirmPassword) {
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
      let errorMsg = 'Erro ao alterar senha. Verifique a senha atual.';
      if (error) {
        if (error.error) {
          errorMsg = error.error;
        }
      }
      toast.error(errorMsg);
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
          let tabClass = 'flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ';
          if (isActive) {
            tabClass = tabClass + 'bg-emerald-600 text-white shadow-sm';
          } else {
            tabClass = tabClass + 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200';
          }
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={tabClass}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================== TAB 1: PERFIL ==================== */}
      {(() => {
        if (activeTab === 'perfil') {
          return (
            <div className="space-y-6">
              {/* User Profile Header Card */}
              <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="h-24 sm:h-28 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 relative">
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)',
                      backgroundSize: '16px 16px',
                    }}
                  />
                </div>
                <div className="px-6 pb-6 relative">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                    <div
                      className={`w-20 h-20 rounded-2xl ${(() => {
                        let avatarName = 'U';
                        if (user) {
                          if (user.name) {
                            avatarName = user.name;
                          }
                        }
                        return getAvatarColor(avatarName);
                      })()} text-white flex items-center justify-center font-bold text-2xl shadow-lg ring-4 ring-white dark:ring-slate-800 shrink-0 -mt-10 sm:-mt-12 relative z-10`}
                    >
                      {(() => {
                        if (user) {
                          if (user.name) {
                            return user.name.charAt(0).toUpperCase();
                          }
                        }
                        return 'U';
                      })()}
                    </div>
                    <div className="flex-1 min-w-0 pt-1 sm:pt-0 sm:pb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white truncate">
                          {(() => {
                            if (user) {
                              if (user.name) {
                                return user.name;
                              }
                            }
                            return 'Usuário';
                          })()}
                        </h2>
                        {(() => {
                          if (user) {
                            return <RoleBadge role={user.role} />;
                          }
                          return null;
                        })()}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {(() => {
                          if (user) {
                            if (user.email) {
                              return user.email;
                            }
                          }
                          return '';
                        })()}
                      </p>
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
                          value={(() => {
                            if (user) {
                              if (user.name) {
                                return user.name;
                              }
                            }
                            return '';
                          })()}
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
                        {(() => {
                          if (savingProfile) {
                            return <Loader2 className="w-4 h-4 animate-spin" />;
                          }
                          return <Save className="w-4 h-4" />;
                        })()}
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
                            type={(() => {
                              if (showCurrentPw) {
                                return 'text';
                              }
                              return 'password';
                            })()}
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
                            {(() => {
                              if (showCurrentPw) {
                                return <EyeOff className="w-3.5 h-3.5" />;
                              }
                              return <Eye className="w-3.5 h-3.5" />;
                            })()}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Nova Senha * (mínimo 6 caracteres)
                        </Label>
                        <div className="relative">
                          <Input
                            type={(() => {
                              if (showNewPw) {
                                return 'text';
                              }
                              return 'password';
                            })()}
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
                            {(() => {
                              if (showNewPw) {
                                return <EyeOff className="w-3.5 h-3.5" />;
                              }
                              return <Eye className="w-3.5 h-3.5" />;
                            })()}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Confirmar Nova Senha *
                        </Label>
                        <Input
                          type={(() => {
                            if (showNewPw) {
                              return 'text';
                            }
                            return 'password';
                          })()}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repita a nova senha"
                          required
                          minLength={6}
                          className="rounded-xl border-slate-200 dark:border-slate-700 text-xs"
                        />
                        {(() => {
                          if (confirmPassword) {
                            if (newPassword) {
                              if (confirmPassword !== newPassword) {
                                return <p className="text-xs text-rose-500 font-medium">As senhas não coincidem.</p>;
                              }
                            }
                          }
                          return null;
                        })()}
                      </div>

                      <Button
                        type="submit"
                        disabled={(() => {
                          if (savingPassword) return true;
                          if (!currentPassword) return true;
                          if (!newPassword) return true;
                          if (!confirmPassword) return true;
                          return false;
                        })()}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs gap-2"
                      >
                        {(() => {
                          if (savingPassword) {
                            return <Loader2 className="w-4 h-4 animate-spin" />;
                          }
                          return <Lock className="w-4 h-4" />;
                        })()}
                        Alterar Senha
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* ==================== TAB 2: APARÊNCIA ==================== */}
      {(() => {
        if (activeTab === 'aparencia') {
          return (
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
                      className={(() => {
                        let cls = 'p-4 rounded-2xl border-2 cursor-pointer transition-all ';
                        if (theme === 'light') {
                          cls = cls + 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20';
                        } else {
                          cls = cls + 'border-slate-200 dark:border-slate-700 hover:border-slate-300';
                        }
                        return cls;
                      })()}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 rounded-xl bg-amber-100 text-amber-600">
                          <Sun className="w-5 h-5" />
                        </div>
                        {(() => {
                          if (theme === 'light') {
                            return <Check className="w-4 h-4 text-emerald-600" />;
                          }
                          return null;
                        })()}
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Tema Claro</h4>
                      <p className="text-xs text-slate-500 mt-1">Visual claro com alto contraste, ideal para ambientes iluminados.</p>
                    </div>

                    <div
                      onClick={() => setTheme('dark')}
                      className={(() => {
                        let cls = 'p-4 rounded-2xl border-2 cursor-pointer transition-all ';
                        if (theme === 'dark') {
                          cls = cls + 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20';
                        } else {
                          cls = cls + 'border-slate-200 dark:border-slate-700 hover:border-slate-300';
                        }
                        return cls;
                      })()}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600">
                          <Moon className="w-5 h-5" />
                        </div>
                        {(() => {
                          if (theme === 'dark') {
                            return <Check className="w-4 h-4 text-emerald-600" />;
                          }
                          return null;
                        })()}
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Tema Escuro</h4>
                      <p className="text-xs text-slate-500 mt-1">Conforto visual para ambientes com pouca luz e economia de energia.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        }
        return null;
      })()}

      {/* ==================== TAB 3: SISTEMA ==================== */}
      {(() => {
        if (activeTab === 'sistema') {
          return (
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
          );
        }
        return null;
      })()}
    </div>
  );
}