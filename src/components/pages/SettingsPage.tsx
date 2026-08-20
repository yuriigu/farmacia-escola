'use client';

import { Settings, Palette, UserCircle } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/lib/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const user = useAuthStore((s) => s.user);

  const settingSections = [
    {
      title: 'Aparência',
      icon: Palette,
      description: 'Personalize o visual do sistema',
      items: [
        {
          key: 'theme' as const,
          label: 'Tema',
          description: 'Alterne entre claro e escuro',
          type: 'select' as const,
          options: ['light', 'dark'],
          optionLabels: { light: 'Claro', dark: 'Escuro' },
          value: theme === 'dark' ? 'dark' : 'light',
          onChange: (v: string) => setTheme(v),
        },
      ],
    },
  ];

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Settings className="w-6 h-6 text-emerald-600" />Configurações
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Personalize o sistema ao seu gosto</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Settings sections */}
        <div className="lg:col-span-2 space-y-6">
          {settingSections.map((section) => {
            const SectionIcon = section.icon;
            return (
              <Card key={section.title} className="hover-shine">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600">
                      <SectionIcon className="w-4 h-4" />
                    </div>
                    {section.title}
                  </CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{section.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {section.items.map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <div className="flex-1 min-w-0 mr-4">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                      </div>
                      <div className="shrink-0">
                        {item.type === 'select' && (
                          <div className="flex gap-1">
                            {item.options.map((opt) => (
                              <button
                                key={opt}
                                onClick={() => {
                                  if (item.key === 'theme') {
                                    item.onChange?.(opt);
                                  }
                                }}
                                className={'px-3 py-1.5 rounded-lg text-xs font-medium transition-all ' + (
                                  (item.value ?? '') === opt
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                )}
                              >
                                {(item.optionLabels as Record<string, string>)[opt] || opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Right: User profile card */}
        <div className="space-y-6">
          <Card className="hover-shine">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCircle className="w-5 h-5 text-emerald-600" />Perfil do Usuário
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-2xl shadow-lg shadow-emerald-500/20">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-100">{user?.name || 'Usuário'}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email || ''}</p>
                  <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800 text-[10px] mt-1">{user?.role || ''}</Badge>
                </div>
              </div>
              {user?.registerDoc && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 text-sm">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Documento de Registro</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{user.registerDoc}</p>
                </div>
              )}
              {user?.phone && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 text-sm mt-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Telefone</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{user.phone}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
