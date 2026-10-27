import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api';
import type { User, Role, Shop } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeShop: Shop | null;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  role: Role | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  refreshUser: () => Promise<void>;
  hasPermission: (module: string, action?: 'read' | 'write') => boolean;
  setActiveShop: (shop: Shop) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('rks_token'),
    isAuthenticated: false,
    isLoading: true,
    activeShop: (localStorage.getItem('rks_activeShop') as Shop) || null,
  });

  const logout = useCallback(() => {
    authApi.logout().catch(() => {}); // Notify backend, ignore errors
    localStorage.removeItem('rks_token');
    localStorage.removeItem('rks_refreshToken');
    localStorage.removeItem('rks_user');
    setState({ user: null, token: null, isAuthenticated: false, isLoading: false, activeShop: null });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authApi.me();
      if (res.data.data) {
        const user = res.data.data as unknown as User;
        localStorage.setItem('rks_user', JSON.stringify(user));
        
        const shopAccess = user.shopAccess || ['SHOP_COMPUTER'];
        // Read the shop from the latest state: a refresh must not undo a shop the person just switched to
        setState(s => {
          let shop = s.activeShop;
          if (!shop || !shopAccess.includes(shop)) {
            shop = shopAccess[0] || 'SHOP_COMPUTER';
            try { localStorage.setItem('rks_activeShop', shop); } catch { /* storage blocked */ }
          }
          return { ...s, user, isAuthenticated: true, isLoading: false, activeShop: shop };
        });
      }
    } catch (err: any) {
      // Only "you are not signed in" signs the person out. A busy server (429), a crash (500)
      // or no network keeps them in with the last known profile; the next request retries.
      const status = err?.response?.status;
      const cached = localStorage.getItem('rks_user');
      if (status !== 401 && status !== 403 && cached) {
        setState(s => ({ ...s, user: JSON.parse(cached) as User, isAuthenticated: true, isLoading: false }));
        return;
      }
      logout();
    }
  }, [logout]);

  useEffect(() => {
    const token = localStorage.getItem('rks_token');
    if (token) {
      setState(s => ({ ...s, token, isLoading: true }));
      refreshUser();
    } else {
      setState(s => ({ ...s, isLoading: false }));
    }
  }, [refreshUser]);

  // How long someone stays signed in is the server's rule, not the app's: the sign-in renews every
  // time the app is used and ends after 7 days without use, or when a super admin ends the session.
  // (An older version signed everyone out after a fixed 8 hours, which made staff retype passwords daily.)
  useEffect(() => { try { localStorage.removeItem('rks_loginTime'); } catch { /* storage blocked */ } }, []);

  const login = async (username: string, password: string) => {
    const res = await authApi.login(username, password);
    const { token, refreshToken, user } = res.data.data!;
    const castUser = user as unknown as User;
    const shopAccess = castUser.shopAccess || ['SHOP_COMPUTER'];
    let shop = localStorage.getItem('rks_activeShop') as Shop;
    if (!shop || !shopAccess.includes(shop)) {
      shop = shopAccess[0] || 'SHOP_COMPUTER';
    }

    localStorage.setItem('rks_token', token);
    if (refreshToken) localStorage.setItem('rks_refreshToken', refreshToken);
    localStorage.setItem('rks_user', JSON.stringify(castUser));
    localStorage.setItem('rks_activeShop', shop);
    setState({ user: castUser, token, isAuthenticated: true, isLoading: false, activeShop: shop });
  };

  const role = state.user?.role ?? null;

  // Same rule as the server (which is the one that enforces it): "change" includes "view"
  const hasPermission = useCallback((module: string, action: 'read' | 'write' = 'read') => {
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true;
    if (role === 'MANAGER' && ['services', 'expenseCategories'].includes(module)) return true;
    if (role === 'CUSTOM') {
      const perms = state.user?.customPermissions?.[module];
      return !!perms && (action === 'read' ? (perms.read || perms.write) : perms.write);
    }
    return false;
  }, [role, state.user?.customPermissions]);

  // A super admin can change someone's role while they are signed in. Pick the change up when the
  // app comes back to the front (at most once a minute) instead of waiting for the next sign-in.
  useEffect(() => {
    if (!state.isAuthenticated) return;
    let last = Date.now();
    const onShow = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < 60_000) return;
      last = Date.now();
      refreshUser();
    };
    document.addEventListener('visibilitychange', onShow);
    window.addEventListener('focus', onShow);
    return () => { document.removeEventListener('visibilitychange', onShow); window.removeEventListener('focus', onShow); };
  }, [state.isAuthenticated, refreshUser]);

  const setActiveShop = useCallback((shop: Shop) => {
    if (state.user?.shopAccess.includes(shop)) {
      localStorage.setItem('rks_activeShop', shop);
      // No full reload: AppShell keys the page by shop, so the page reloads its data for the new shop
      setState(s => ({ ...s, activeShop: shop }));
    }
  }, [state.user?.shopAccess]);

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      logout,
      role,
      isAdmin: role === 'ADMIN' || role === 'SUPER_ADMIN',
      isSuperAdmin: role === 'SUPER_ADMIN',
      refreshUser,
      hasPermission,
      setActiveShop,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


