'use client';

import { useState, useEffect, ReactNode, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Toaster, toast } from 'sonner';
import {
  Pill, LogOut, Menu, XIcon, Sun, Moon, UserRound, ChevronRight, Settings
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/lib/auth-store';
import { fetchAllData, fetchBatchesData, useDataLoader } from '@/lib/pharmacy-store';
import {
  getVisibleModules, getModuleById,
} from '@/lib/constants';
import type { ModuleId } from '@/lib/constants';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

// Map route path to ModuleId
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
  '/pacientes': 'pacientes',
  '/administracao': 'administracao',
  '/admin': 'administracao',
  '/configuracoes': 'configuracoes',
  '/profile': 'configuracoes',
};

interface AppShellProps {
  children: ReactNode;
  activeModuleId?: ModuleId;
  pageTitle?: string;
}

function AppShellInner({ children, activeModuleId, pageTitle }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { token, user, loading: authLoading, hydrate, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const userRole = user?.role;
  const visibleModules = getVisibleModules(userRole ?? '', user?.permissions);

  const currentModuleId = activeModuleId || PATH_MODULE_MAP[pathname] || 'dashboard';
  const activeModule = getModuleById(currentModuleId);

  // Hydrate on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Notify if user was redirected due to lack of permissions
  useEffect(() => {
    if (searchParams.get('denied') === '1') {
      toast.error('Acesso negado: Você não tem permissão para acessar aquela rota.');
    }
  }, [searchParams]);

  // Auth protection: redirect to login if unauthenticated
  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/login');
    }
  }, [token, authLoading, router]);

  useDataLoader(!!token);

  // Auto-refresh data periodically
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      fetchAllData();
      fetchBatchesData();
    }, 300000);
    return () => clearInterval(interval);
  }, [token]);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  if (authLoading || (!token && typeof window !== 'undefined')) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        Verificando sessão...
      </div>
    );
  }

  const headerTitle = pageTitle || activeModule?.label || 'Dashboard';

  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 flex">
      <Toaster position="top-right" richColors />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ==================== SIDEBAR ==================== */}
      <aside
        className={
          'fixed lg:static inset-y-0 left-0 z-50 w-64 glass-sidebar text-slate-300 flex flex-col shrink-0 transform transition-transform duration-300 ease-out ' +
          (sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')
        }
      >
        {/* Logo */}
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
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation links */}
        <ScrollArea className="flex-1 min-h-0 p-3 space-y-1 relative">
          {visibleModules.map((mod) => {
            const Icon = mod.icon;
            const href = mod.path || `/${mod.id}`;
            const isActive =
              pathname === href ||
              (href !== '/dashboard' && pathname.startsWith(`${href}/`)) ||
              (mod.id === 'agendamentos' && pathname === '/appointments') ||
              (mod.id === 'administracao' && pathname === '/admin');
            return (
              <Link
                key={mod.id}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={
                  'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ' +
                  (isActive
                    ? 'sidebar-item-active font-semibold'
                    : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:translate-x-0.5')
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{mod.label}</span>
              </Link>
            );
          })}
        </ScrollArea>
      </aside>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header with Breadcrumbs */}
        <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
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

          <div className="flex items-center gap-2 sm:gap-3">
            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2.5 cursor-pointer">
                  <div className="hidden sm:block text-right">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                      {user?.name || 'Usuário'}
                    </p>
                    <RoleBadge role={user?.role} className="mt-0.5 text-[10px] py-0 px-2" />
                  </div>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-sm ring-2 ring-emerald-200 dark:ring-emerald-800 hover:shadow-lg hover:shadow-emerald-500/20 transition-all">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-2xl animate-fade-in-scale">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                      {user?.name || 'Usuário'}
                    </p>
                    <p className="text-xs text-slate-400">{user?.email || ''}</p>
                    <RoleBadge role={user?.role} className="w-fit text-[10px] mt-1" />
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/configuracoes?tab=perfil" className="cursor-pointer gap-2 text-sm flex items-center">
                    <UserRound className="w-4 h-4" />
                    Meu Perfil & Senha
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/configuracoes" className="cursor-pointer gap-2 text-sm flex items-center">
                    <Settings className="w-4 h-4" />
                    Configurações & Tema
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="cursor-pointer gap-2 text-sm"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
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
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

export function AppShell(props: AppShellProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400">Carregando...</div>}>
      <AppShellInner {...props} />
    </Suspense>
  );
}