'use client';

import { useState, useEffect, Suspense } from 'react';
import { Toaster } from 'sonner';
import {
  Pill, LogOut, Menu, XIcon, Sun, Moon, Plus, UserRound,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/lib/auth-store';
import { usePharmacyStore, fetchAllData, fetchBatchesData, useDataLoader } from '@/lib/pharmacy-store';
import {
  getVisibleModules, getVisibleTabs, getModuleById, canWriteClient,
} from '@/lib/constants';
import type { ModuleId } from '@/lib/constants';
import { useAppRouter } from '@/lib/useAppRouter';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { LoginPage } from '@/components/pages/LoginPage';
import { RegisterPage } from '@/components/pages/RegisterPage';
import { DashboardPage } from '@/components/pages/DashboardPage';
import { SettingsPage } from '@/components/pages/SettingsPage';
import { ProfilePage } from '@/components/pages/ProfilePage';
import { CalendarModule } from '@/components/modules/CalendarModule';
import { InventoryModule } from '@/components/modules/InventoryModule';
import { AdminModule } from '@/components/modules/AdminModule';

// ==================== LOADING SCREEN ====================
function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
      Verificando sessão...
    </div>
  );
}

// ==================== MAIN APP (with Suspense for router) ====================
function FarmaciaEscolaApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showRegister, setShowRegister] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('show-register') === '1';
    return false;
  });
  const { token, user, loading: authLoading, hydrate, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const userRole = user?.role;

  // URL-based routing
  const { route, navigate, changeTab, visibleModules } = useAppRouter(userRole, user?.permissions);

  const activeModule = getModuleById(route.module);
  const visibleTabs = activeModule ? getVisibleTabs(activeModule, userRole ?? '', user?.permissions) : [];
  const effectiveTab = route.tab || activeModule?.defaultTab || '';
  const actionLabel = activeModule?.actionLabels[effectiveTab] || '';

  // Map tab IDs to entity names for canWriteClient
  const TAB_ENTITY_MAP: Record<string, string> = {
    medicamentos: 'medicines',
    lotes: 'batches',
    retiradas: 'withdrawals',
    descartes: 'disposals',
    agenda: 'schedule-slots',
    agendamentos: 'appointments',
    pacientes: 'patients',
    usuarios: 'users',
  };
  const canShowAction = actionLabel && canWriteClient(user?.role, user?.permissions, TAB_ENTITY_MAP[effectiveTab] || '');

  // Hydrate on mount
  useEffect(() => { hydrate(); }, [hydrate]);

  // Initialize page based on token
  useEffect(() => {
    if (authLoading) return;
    if (token && !user) return;
    if (!token) {
      // Not authenticated — show login (handled below)
    }
  }, [token, authLoading, user]);

  useDataLoader(!!token);

  // Auto-refresh data — hardcoded to 5 minutes
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      fetchAllData();
      fetchBatchesData();
    }, 300000); // 5 minutes hardcoded
    return () => clearInterval(interval);
  }, [token]);

  const handleLogout = () => {
    logout();
  };

  // Auth loading
  if (authLoading) return <LoadingScreen />;

  // Login page
  if (!token || !user) {
    if (showRegister) {
      return <RegisterPage onSwitchToLogin={() => { localStorage.removeItem('show-register'); setShowRegister(false); }} />;
    }
    return <LoginPage onSwitchToRegister={() => { localStorage.setItem('show-register', '1'); setShowRegister(true); }} />;
  }

  // Profile page — shown inline in main content (not separate)
  const renderModule = () => {
    switch (route.module) {
      case 'dashboard':
        return <DashboardPage onNavigate={(mod, tab) => navigate(mod as ModuleId, tab)} />;
      case 'calendario':
        return activeModule ? (
          <CalendarModule module={activeModule} activeTab={effectiveTab} onTabChange={changeTab} />
        ) : null;
      case 'estoque':
        return activeModule ? (
          <InventoryModule module={activeModule} activeTab={effectiveTab} onTabChange={changeTab} />
        ) : null;
      case 'administracao':
        return activeModule ? (
          <AdminModule module={activeModule} activeTab={effectiveTab} onTabChange={changeTab} />
        ) : null;
      case 'configuracoes':
        return <SettingsPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <DashboardPage onNavigate={(mod, tab) => navigate(mod as ModuleId, tab)} />;
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 flex">
      <Toaster position="top-right" richColors />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ==================== SIDEBAR ==================== */}
      <aside className={'fixed lg:static inset-y-0 left-0 z-50 w-64 glass-sidebar text-slate-300 flex flex-col shrink-0 transform transition-transform duration-300 ease-out ' + (sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')}>
        {/* Logo */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />
        <div className="p-5 flex items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white shadow-lg shadow-emerald-900/30">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-white text-base leading-tight">Farmácia Escola</h1>
              <p className="text-[10px] text-slate-400 font-medium">Sistema de Gestão Farmacêutica</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white transition-colors">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation — 5 items, no category labels */}
        <ScrollArea className="flex-1 min-h-0 p-3 space-y-1 relative">
          {visibleModules.map((mod) => {
            const Icon = mod.icon;
            const isActive = route.module === mod.id;
            return (
              <button
                key={mod.id}
                onClick={() => { navigate(mod.id); setSidebarOpen(false); }}
                className={'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ' + (isActive ? 'sidebar-item-active font-semibold' : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:translate-x-0.5')}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{mod.label}</span>
              </button>
            );
          })}
        </ScrollArea>
      </aside>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
                {activeModule?.label || 'Dashboard'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dynamic Action Button — only if user can write to this entity */}
            {canShowAction && (
              <Button onClick={() => {
                // Dispatch custom event for the active module to pick up
                window.dispatchEvent(new CustomEvent('pharmacy:action', { detail: { module: route.module, tab: effectiveTab } }));
              }} className="rounded-xl gap-2 active:scale-[0.98] transition-transform text-sm">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">{actionLabel}</span>
              </Button>
            )}

            {/* User Profile Dropdown (top-right) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">{user?.name || 'Usuário'}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">{user?.role || ''}</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-sm ring-2 ring-emerald-200 dark:ring-emerald-800 cursor-pointer hover:shadow-lg hover:shadow-emerald-500/20 transition-all">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-xl animate-fade-in-scale">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{user?.name || 'Usuário'}</p>
                    <p className="text-xs text-slate-400">{user?.email || ''}</p>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 w-fit text-[10px] px-1.5 py-0 mt-0.5">{user?.role || ''}</Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('profile')} className="cursor-pointer gap-2 text-sm">
                  <UserRound className="w-4 h-4" />Meu Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="cursor-pointer gap-2 text-sm">
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer gap-2 text-sm text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-900/20">
                  <LogOut className="w-4 h-4" />Sair do Sistema
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content — NO footer, NO date sub-header */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {renderModule()}
        </main>
      </div>
    </div>
  );
}

// ==================== DEFAULT EXPORT WITH SUSPENSE ====================
export default function FarmaciaEscolaPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <FarmaciaEscolaApp />
    </Suspense>
  );
}
