'use client';

// IMPORTS DO REACT
import { useState, useEffect, ReactNode, Suspense } from 'react';

// IMPORTS DE BIBLIOTECAS
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Toaster, toast } from 'sonner';
import {
  Pill, LogOut, Menu, XIcon, Sun, Moon, UserRound, ChevronRight, Settings, ShieldAlert
} from 'lucide-react';
import { useTheme } from 'next-themes';

// IMPORTS LOCAIS
import { useAuthStore } from '@/lib/AuthStore';
import { fetchAllData, fetchBatchesData, useDataLoader } from '@/lib/PharmacyStore';
import {
  getVisibleModules, getModuleById,
} from '@/lib/Constants';
import type { ModuleId } from '@/lib/Constants';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { hasRouteAccess } from '@/config/Rbac';
import { ScrollArea } from '@/components/ui/ScrollArea';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/DropdownMenu';

// MAPEAMENTO DE ROTA PARA ID DE MODULO
const PATH_MODULE_MAP: Record<string, ModuleId> = {
  '/dashboard': 'dashboard',
  '/medicines': 'medicines',
  '/estoque': 'estoque',
  '/retiradas': 'retiradas',
  '/descartes': 'descartes',
  '/agendamentos': 'agendamentos',
  '/appointments': 'agendamentos',
  '/appointments/new': 'agendamentos',
  '/calendario': 'calendario',
  '/scales': 'scales',
  '/pacientes': 'pacientes',
  '/administracao': 'administracao',
  '/admin': 'administracao',
  '/configuracoes': 'configuracoes',
  '/profile': 'configuracoes',
  '/settings': 'settings',
  '/my-appointments': 'my-appointments',
  '/my-withdrawals': 'my-withdrawals',
};

// INTERFACE DAS PROPRIEDADES DO COMPONENTE
interface AppShellProps {
  children: ReactNode;
  activeModuleId?: ModuleId;
  pageTitle?: string;
}

// COMPONENTE INTERNO DO SHELL
function AppShellInner({ children, activeModuleId, pageTitle }: AppShellProps) {
  // ESTADOS DO COMPONENTE
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { token, user, loading: authLoading, hydrate, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // OBTENDO O PAPEL DO USUARIO DE FORMA EXPLICITA
  let userRole = '';
  if (user) {
    if (user.role) {
      userRole = user.role;
    } else {
      userRole = '';
    }
  } else {
    userRole = '';
  }

  // OBTENDO AS PERMISSOES DO USUARIO
  let userPermissions: Record<string, boolean> | undefined = undefined;
  if (user) {
    if (user.permissions) {
      userPermissions = user.permissions;
    } else {
      userPermissions = undefined;
    }
  } else {
    userPermissions = undefined;
  }

  const visibleModules = getVisibleModules(userRole, userPermissions);
  const isRouteAuthorized = hasRouteAccess(userRole, pathname || '/dashboard');

  // DETERMINANDO O ID DO MODULO ATUAL
  let currentModuleId: ModuleId = 'dashboard';
  if (activeModuleId) {
    currentModuleId = activeModuleId;
  } else if (PATH_MODULE_MAP[pathname]) {
    currentModuleId = PATH_MODULE_MAP[pathname];
  } else {
    currentModuleId = 'dashboard';
  }

  const activeModule = getModuleById(currentModuleId);

  // HIDRATAR ESTADO AO MONTAR COMPONENTE
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // NOTIFICAR ACESSO NEGADO SE REDIRECIONADO
  useEffect(() => {
    const deniedParam = searchParams.get('denied');
    if (deniedParam === '1') {
      toast.error('Acesso negado: Você não tem permissão para acessar aquela rota.');
    }
  }, [searchParams]);

  // REDIRECIONAR PARA LOGIN SE NAO ESTIVER AUTENTICADO
  useEffect(() => {
    if (!authLoading) {
      if (!token) {
        router.replace('/login');
      }
    }
  }, [token, authLoading, router]);

  const isUserAuthenticated = Boolean(token);
  useDataLoader(isUserAuthenticated);

  // ATUALIZAR DADOS PERIODICAMENTE
  useEffect(() => {
    if (!token) {
      return;
    }
    const interval = setInterval(() => {
      fetchAllData();
      fetchBatchesData();
    }, 300000);
    return () => {
      clearInterval(interval);
    };
  }, [token]);

  // FUNCAO PARA SAIR DO SISTEMA
  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  // VERIFICANDO SE DEVE EXIBIR TELA DE CARREGAMENTO
  let shouldShowLoading = false;
  if (authLoading) {
    shouldShowLoading = true;
  } else if (!token) {
    if (typeof window !== 'undefined') {
      shouldShowLoading = true;
    }
  }

  if (shouldShowLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        Verificando sessão...
      </div>
    );
  }

  // DEFININDO O TITULO DO CABECALHO
  let headerTitle = 'Dashboard';
  if (pageTitle) {
    headerTitle = pageTitle;
  } else if (activeModule) {
    if (activeModule.label) {
      headerTitle = activeModule.label;
    } else {
      headerTitle = 'Dashboard';
    }
  } else {
    headerTitle = 'Dashboard';
  }

  // PREPARANDO DADOS DO USUARIO PARA RENDERIZACAO
  let userName = 'Usuário';
  if (user) {
    if (user.name) {
      userName = user.name;
    } else {
      userName = 'Usuário';
    }
  } else {
    userName = 'Usuário';
  }

  let userInitial = 'U';
  if (user) {
    if (user.name) {
      const firstChar = user.name.charAt(0);
      if (firstChar) {
        userInitial = firstChar.toUpperCase();
      } else {
        userInitial = 'U';
      }
    } else {
      userInitial = 'U';
    }
  } else {
    userInitial = 'U';
  }

  let userEmail = '';
  if (user) {
    if (user.email) {
      userEmail = user.email;
    } else {
      userEmail = '';
    }
  } else {
    userEmail = '';
  }

  let userRoleProp: string | undefined = undefined;
  if (user) {
    if (user.role) {
      userRoleProp = user.role;
    } else {
      userRoleProp = undefined;
    }
  } else {
    userRoleProp = undefined;
  }

  // CLASSES DA BARRA LATERAL
  let sidebarClasses = 'fixed lg:static inset-y-0 left-0 z-50 w-64 glass-sidebar text-slate-300 flex flex-col shrink-0 transform transition-transform duration-300 ease-out ';
  if (sidebarOpen) {
    sidebarClasses = sidebarClasses + 'translate-x-0';
  } else {
    sidebarClasses = sidebarClasses + '-translate-x-full lg:translate-x-0';
  }

  // OVERLAY MOBILE
  let mobileOverlay: ReactNode = null;
  if (sidebarOpen) {
    mobileOverlay = (
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
        onClick={() => {
          setSidebarOpen(false);
        }}
      />
    );
  }

  // ALTERNAR TEMA
  const handleToggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  const restrictedContent = (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl border border-rose-200 bg-rose-50/40 p-6 text-center shadow-sm dark:border-rose-900/50 dark:bg-rose-950/20">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Acesso Restrito</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Seu perfil não possui permissão para acessar esta área do sistema.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          Voltar ao Dashboard
        </Link>
      </div>
    </div>
  );

  let themeIcon = <Moon className="w-4 h-4" />;
  let themeLabel = 'Tema Escuro';
  if (theme === 'dark') {
    themeIcon = <Sun className="w-4 h-4" />;
    themeLabel = 'Tema Claro';
  } else {
    themeIcon = <Moon className="w-4 h-4" />;
    themeLabel = 'Tema Escuro';
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 flex">
      <Toaster position="top-right" richColors />

      {/* OVERLAY PARA MOBILE */}
      {mobileOverlay}

      {/* ==================== BARRA LATERAL ==================== */}
      <aside className={sidebarClasses}>
        {/* LOGO */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />
        <div className="p-5 flex items-center justify-between gap-3 border-b border-slate-800">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white shadow-lg shadow-emerald-900/30">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-white text-base leading-tight">Farmácia Escola</h1>
              <p className="text-[10px] text-slate-400 font-medium">Gestão Integrada Universitária</p>
            </div>
          </Link>
          <button
            onClick={() => {
              setSidebarOpen(false);
            }}
            className="lg:hidden text-slate-400 hover:text-white transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* LINKS DE NAVEGACAO */}
        <ScrollArea className="flex-1 min-h-0 p-3 pb-6 space-y-1 relative">
          {visibleModules.map((mod) => {
            const Icon = mod.icon;
            let href = `/${mod.id}`;
            if (mod.path) {
              href = mod.path;
            } else {
              href = `/${mod.id}`;
            }

            let isActive = false;
            if (pathname === href) {
              isActive = true;
            } else if (href !== '/dashboard' && pathname.startsWith(`${href}/`)) {
              isActive = true;
            } else if (mod.id === 'agendamentos' && pathname === '/appointments') {
              isActive = true;
            } else if (mod.id === 'administracao' && pathname === '/admin') {
              isActive = true;
            } else {
              isActive = false;
            }

            let itemClasses = 'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ';
            if (isActive) {
              itemClasses = itemClasses + 'sidebar-item-active font-semibold';
            } else {
              itemClasses = itemClasses + 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:translate-x-0.5';
            }

            return (
              <Link
                key={mod.id}
                href={href}
                onClick={() => {
                  setSidebarOpen(false);
                }}
                className={itemClasses}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{mod.label}</span>
              </Link>
            );
          })}
        </ScrollArea>
        <div className="pb-6 mb-2" />
      </aside>

      {/* ==================== CONTEUDO PRINCIPAL ==================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* CABECALHO COM BREADCRUMBS */}
        <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-3 sticky top-0 z-10">
          <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSidebarOpen(true);
                }}
                className="lg:hidden p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                <Link href="/dashboard" className="hover:text-emerald-600 transition-colors">
                  Início
                </Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  {headerTitle}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 mr-2 sm:mr-3">
              {/* DROPDOWN DO PERFIL DO USUARIO */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-2.5 cursor-pointer">
                    <div className="hidden sm:block text-right">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                        {userName}
                      </p>
                      <RoleBadge role={userRoleProp} className="mt-0.5 text-[10px] py-0 px-2" />
                    </div>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-sm ring-2 ring-emerald-200 dark:ring-emerald-800 hover:shadow-lg hover:shadow-emerald-500/20 transition-all">
                      {userInitial}
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-2xl animate-fade-in-scale">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                        {userName}
                      </p>
                      <p className="text-xs text-slate-400">{userEmail}</p>
                      <RoleBadge role={userRoleProp} className="w-fit text-[10px] mt-1" />
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer gap-2 text-sm flex items-center">
                      <UserRound className="w-4 h-4" />
                      Meu Perfil & Senha
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer gap-2 text-sm flex items-center">
                      <Settings className="w-4 h-4" />
                      Configurações & Tema
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleToggleTheme}
                    className="cursor-pointer gap-2 text-sm"
                  >
                    {themeIcon}
                    {themeLabel}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer gap-2 text-sm text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-900/20"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair do Sistema
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* CONTEUDO DA PAGINA */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="w-full max-w-7xl mx-auto">
            {isRouteAuthorized ? children : restrictedContent}
          </div>
        </main>
      </div>
    </div>
  );
}

// COMPONENTE PRINCIPAL APP SHELL
export function AppShell(props: AppShellProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400">Carregando...</div>}>
      <AppShellInner {...props} />
    </Suspense>
  );
}