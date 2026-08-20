'use client';

import { useState, useCallback, useEffect } from 'react';
import type { ModuleId, TabId } from './constants';
import { getModuleById, getVisibleModules } from './constants';

export interface RouteState {
  module: ModuleId;
  tab: TabId;
}

/**
 * Custom hook for URL-based client-side routing within a single page.tsx.
 * Uses window.history.replaceState to update the displayed URL without
 * triggering Next.js navigation (since all routes live at `/`).
 */
export function useAppRouter(role?: string | null, permissions?: Record<string, boolean> | null) {
  const visibleModules = getVisibleModules(role ?? '', permissions);

  const parseUrl = useCallback((): RouteState => {
    if (typeof window === 'undefined') return { module: 'dashboard', tab: '' };
    const path = window.location.pathname.slice(1) || 'dashboard';
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') || '';
    const activeModuleId = getModuleById(path as ModuleId) ? (path as ModuleId) : 'dashboard';
    const modConfig = getModuleById(activeModuleId);
    const defaultTab = modConfig?.defaultTab || '';
    return { module: activeModuleId, tab: tab || defaultTab };
  }, []);

  const [route, setRoute] = useState<RouteState>(parseUrl);

  // Sync URL changes (back/forward buttons)
  useEffect(() => {
    const handler = () => setRoute(parseUrl());
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [parseUrl]);

  const navigate = useCallback((targetModule: ModuleId, tab?: TabId) => {
    const modConfig = getModuleById(targetModule);
    const resolvedTab = tab || modConfig?.defaultTab || '';
    const queryString = resolvedTab ? `?tab=${resolvedTab}` : '';
    const url = `/${targetModule}${queryString}`;

    setRoute({ module: targetModule, tab: resolvedTab });

    // Update browser URL without navigation
    window.history.replaceState(null, '', url);
  }, []);

  const changeTab = useCallback((tab: TabId) => {
    navigate(route.module, tab);
  }, [navigate, route.module]);

  return {
    route,
    navigate,
    changeTab,
    visibleModules,
  };
}
