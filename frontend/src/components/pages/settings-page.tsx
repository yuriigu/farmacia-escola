'use client';

import { useState } from 'react';
import { toast } from '@/lib/toast-handler';
import {
  Settings, UserRound, Lock, Save, Eye, EyeOff, Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { getAvatarColor } from '@/lib/constants';
import { maskCPF, maskPhone, onlyDigits } from '@/lib/masks';
import { RoleBadge } from '@/components/shared/role-badge';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/ui/field-error';
import { FormError } from '@/components/ui/form-error';

// pagina de configuracoes do usuario. cobre duas areas:
// - dados de contato (email, telefone, endereco)
// - alteracao de senha (exige senha atual)
// o nome e o identificador (crf/crm/matricula/cpf) sao somente
// leitura aqui, porque so admin pode alterar (fica explicito no
// texto auxiliar de cada campo).
export function SettingsPage() {

  const { user, token, setAuth } = useAuthStore();

  // flag que garante que o usuario tem id valido (nem null nem
  // undefined) antes de renderizar os cards de perfil.
  let hasValidUser = false;
  if (user) {
    if (user.id !== null) {
      if (user.id !== undefined) {
        hasValidUser = true;
      }
    }
  }

  // email inicial puxado do usuario. se ele nao vier, fica vazio.
  let initialEmail = '';
  if (user) {
    if (user.email) {
      initialEmail = user.email;
    }
  }
  const [email, setEmail] = useState(() => user?.email ?? initialEmail);

  // telefone inicial puxado do usuario.
  let initialPhone = '';
  if (user) {
    if (user.phone) {
      initialPhone = user.phone;
    }
  }
  const [phone, setPhone] = useState(() => maskPhone(user?.phone ?? initialPhone));

  const [address, setAddress] = useState(() => user?.patient?.address ?? user?.address ?? '');
  const [name, setName] = useState(() => user?.name ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  // erro global do form de perfil. fica fixo no topo do formulario.
  const [profileError, setProfileError] = useState('');

  // campos de senha. os toggles controlam mostrar/ocultar.
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<{ currentPassword?: string; newPassword?: string; confirmPassword?: string }>({});
  // erro global do form de senha (ex: senha atual incorreta).
  const [passwordError, setPasswordError] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // salva os dados do perfil e sincroniza a sessao com o retorno do backend.
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!user.id) return;

    setProfileError('');
    setSavingProfile(true);
    try {
      const result = await api.updateProfile({ name, email, phone, address });
      setAuth(token ?? '', result.user);
      toast.success('Perfil atualizado com sucesso!');
    } catch (err: unknown) {
      setProfileError(err instanceof Error && err.message ? err.message : 'Erro ao atualizar perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  // altera a senha. valida presenca dos tres campos, tamanho minimo
  // da nova senha (6) e igualdade com a confirmacao. a senha atual
  // e conferida pelo backend.
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    const nextErrors: typeof passwordErrors = {};
    if (!currentPassword) {
      nextErrors.currentPassword = 'Informe a senha atual.';
    }
    if (!newPassword) {
      nextErrors.newPassword = 'Informe a nova senha.';
    }
    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Confirme a nova senha.';
    }
    if (newPassword && newPassword.length < 6) {
      nextErrors.newPassword = 'A nova senha deve ter pelo menos 6 caracteres.';
    }
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      nextErrors.confirmPassword = 'A nova senha e a confirmação não coincidem.';
    }
    setPasswordErrors(nextErrors);
    const firstInvalidField = Object.keys(nextErrors)[0];
    if (firstInvalidField) {
      document.getElementById(`password-${firstInvalidField}`)?.focus();
      return;
    }

    setSavingPassword(true);
    try {
      // chamamos o cliente http (/lib/api) pra alterar a senha. o
      // backend exige a senha atual pra confirmar.
      await api.updateProfilePassword({
        currentPassword,
        newPassword,
      });
      toast.success('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setPasswordError(err instanceof Error && err.message ? err.message : 'Erro ao alterar senha. Verifique a senha atual.');
    } finally {
      setSavingPassword(false);
    }
  };



  return (
    <div className="space-y-6 max-w-5xl mx-auto page-enter">
      {/* cabecalho da pagina */}
      <PageHeader
        title="Configurações"
        description="Gerencie seus dados de acesso, preferências visuais e informações da conta."
        icon={Settings}
      />



      {/* fallback quando nao ha usuario valido (estado intermediario
          enquanto a store hidrata, ou sessao quebrada). */}
      {(() => {
        if (!hasValidUser) {
          return (
            <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Perfil Indisponível</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Faça login com um usuário válido para visualizar seus dados.</p>
            </div>
          );
        }
        return null;
      })()}

      {/* conteudo principal, so quando ha usuario valido */}
      {(() => {
        if (hasValidUser) {
          return (
            <div className="space-y-6">
              {/* cabecalho do perfil: banner com gradiente + avatar
                  sobreposto. o avatar usa a inicial do nome e a cor
                  vem de getavatarcollor. */}
              <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="h-24 sm:h-28 bg-linear-to-r from-emerald-600 via-teal-600 to-emerald-700 relative">
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
                    {/* avatar com inicial, cor derivada do nome */}
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
                    {/* nome + badge de papel + email */}
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

              {/* grade com dois cards lado a lado em telas grandes:
                  contato e senha. */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* card de informacoes de contato */}
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
                      <FormError message={profileError} />
                      {/* nome editavel */}
                      <div className="space-y-1.5">
                        <Label htmlFor="password-currentPassword" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Nome Completo
                        </Label>
                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          className="rounded-xl border-slate-200 dark:border-slate-700 text-xs"
                        />
                      </div>

                      {/* identificador tambem somente leitura */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Identificador (CRF / CRM / Matrícula / CPF)
                        </Label>
                        <Input
                          value={(() => {
                            // resolve o documento real do usuario logado
                            // conforme o papel: paciente usa o cpf do
                            // cadastro vinculado (fallback: registerDoc);
                            // os demais usam o registerDoc (crf/crm/ra).
                            // ids internos do banco (id/patientId) nunca
                            // sao exibidos aqui.
                            if (!user) {
                              return '—';
                            }
                            let doc = user.registerDoc ?? '';
                            if (user.role === 'PACIENTE') {
                              doc = user.patient?.cpf || doc;
                            }
                            const value = String(doc).trim();
                            if (!value) {
                              return '—';
                            }
                            return onlyDigits(value).length === 11 ? maskCPF(value) : value;
                          })()}
                          disabled
                          className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed rounded-xl text-xs"
                        />
                        <p className="text-[11px] text-slate-400">O identificador é imutável na auto-edição de perfil.</p>
                      </div>

                      {/* email editavel */}
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

                      {/* telefone editavel */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Telefone / WhatsApp
                        </Label>
                        <Input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(maskPhone(e.target.value))}
                          placeholder="(00) 00000-0000"
                          className="rounded-xl border-slate-200 dark:border-slate-700 text-xs"
                        />
                      </div>

                      {/* endereco editavel */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Endereço Completo
                        </Label>
                        <Input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Rua, número, bairro, cidade - UF"
                          className="rounded-xl border-slate-200 dark:border-slate-700 text-xs"
                        />
                      </div>

                      {/* botao de salvar. vira spinner enquanto salva. */}
                      <Button
                        type="submit"
                        disabled={savingProfile}
                        className="w-full"
                        size="sm"
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

                {/* card de alteracao de senha */}
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
                      <FormError message={passwordError} />
                      {/* senha atual com toggle de visibilidade */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Senha Atual *
                        </Label>
                        <div className="relative">
                          <Input
                            id="password-currentPassword"
                            type={(() => {
                              if (showCurrentPw) {
                                return 'text';
                              }
                              return 'password';
                            })()}
                            value={currentPassword}
                            aria-invalid={!!passwordErrors.currentPassword}
                            aria-describedby={passwordErrors.currentPassword ? 'password-currentPassword-error' : undefined}
                            onChange={(e) => {
                              setCurrentPassword(e.target.value);
                              setPasswordErrors((current) => ({ ...current, currentPassword: undefined }));
                            }}
                            placeholder="••••••••"
                            className="pr-9 rounded-xl border-slate-200 dark:border-slate-700 text-xs"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setShowCurrentPw(!showCurrentPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {(() => {
                              if (showCurrentPw) {
                                return <EyeOff className="w-3.5 h-3.5" />;
                              }
                              return <Eye className="w-3.5 h-3.5" />;
                            })()}
                          </Button>
                        </div>
                        {passwordErrors.currentPassword && <FieldError id="password-currentPassword-error" message={passwordErrors.currentPassword} />}
                      </div>

                      {/* nova senha com toggle */}
                      <div className="space-y-1.5">
                        <Label htmlFor="password-newPassword" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Nova Senha * (mínimo 6 caracteres)
                        </Label>
                        <div className="relative">
                          <Input
                            id="password-newPassword"
                            type={(() => {
                              if (showNewPw) {
                                return 'text';
                              }
                              return 'password';
                            })()}
                            value={newPassword}
                            aria-invalid={!!passwordErrors.newPassword}
                            aria-describedby={passwordErrors.newPassword ? 'password-newPassword-error' : undefined}
                            onChange={(e) => {
                              setNewPassword(e.target.value);
                              setPasswordErrors((current) => ({ ...current, newPassword: undefined }));
                            }}
                            placeholder="••••••••"
                            className="pr-9 rounded-xl border-slate-200 dark:border-slate-700 text-xs"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setShowNewPw(!showNewPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {(() => {
                              if (showNewPw) {
                                return <EyeOff className="w-3.5 h-3.5" />;
                              }
                              return <Eye className="w-3.5 h-3.5" />;
                            })()}
                          </Button>
                        </div>
                        {passwordErrors.newPassword && <FieldError id="password-newPassword-error" message={passwordErrors.newPassword} />}
                      </div>

                      {/* confirmacao da nova senha. mostra aviso quando
                          as duas nao batem. */}
                      <div className="space-y-1.5">
                        <Label htmlFor="password-confirmPassword" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Confirmar Nova Senha *
                        </Label>
                        <Input
                          id="password-confirmPassword"
                          type={(() => {
                            if (showNewPw) {
                              return 'text';
                            }
                            return 'password';
                          })()}
                          value={confirmPassword}
                          aria-invalid={!!passwordErrors.confirmPassword || (!!confirmPassword && !!newPassword && confirmPassword !== newPassword)}
                          aria-describedby={passwordErrors.confirmPassword || (!!confirmPassword && !!newPassword && confirmPassword !== newPassword) ? 'password-confirmPassword-error' : undefined}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setPasswordErrors((current) => ({ ...current, confirmPassword: undefined }));
                          }}
                          placeholder="Repita a nova senha"
                          className="rounded-xl border-slate-200 dark:border-slate-700 text-xs"
                        />
                        {(() => {
                          if (confirmPassword) {
                            if (newPassword) {
                              if (confirmPassword !== newPassword) {
                                return <FieldError id="password-confirmPassword-error" message={passwordErrors.confirmPassword ?? 'As senhas não coincidem.'} />;
                              }
                            }
                          }
                          return null;
                        })()}
                      </div>

                      {/* botao de salvar senha. desabilitado enquanto
                          algum campo estiver vazio ou salvando. */}
                      <Button
                        type="submit"
                        disabled={(() => {
                          return savingPassword;
                        })()}
                        className="w-full"
                        size="sm"
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


    </div>
  );
}