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
        let newActiveShop = state.activeShop;
        if (!newActiveShop || !shopAccess.includes(newActiveShop)) {
          newActiveShop = shopAccess[0] || 'SHOP_COMPUTER';
          localStorage.setItem('rks_activeShop', newActiveShop);
        }

        setState(s => ({ ...s, user, isAuthenticated: true, isLoading: false, activeShop: newActiveShop }));
      }
    } catch {
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

  // Auto-logout after 8 hours of session
  useEffect(() => {
    const checkSession = () => {
      const loginTime = localStorage.getItem('rks_loginTime');
      if (loginTime && state.isAuthenticated) {
        const elapsed = Date.now() - parseInt(loginTime, 10);
        const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
        if (elapsed > EIGHT_HOURS_MS) {
          logout();
          alert('Your session has expired after 8 hours. Please log in again.');
        }
      }
    };
    
    // Check every minute
    const intervalId = setInterval(checkSession, 60 * 1000);
    // Initial check
    checkSession();
    
    return () => clearInterval(intervalId);
  }, [state.isAuthenticated, logout]);

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
    localStorage.setItem('rks_loginTime', Date.now().toString());
    
    setState({ user: castUser, token, isAuthenticated: true, isLoading: false, activeShop: shop });
  };

  const role = state.user?.role ?? null;

  const hasPermission = useCallback((module: string, action: 'read' | 'write' = 'read') => {
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true;
    if (role === 'MANAGER' && ['services', 'expenseCategories'].includes(module)) return true;
    if (role === 'CUSTOM') {
      const perms = state.user?.customPermissions?.[module];
      return !!(perms && (action === 'read' ? perms.read : perms.write));
    }
    return false;
  }, [role, state.user?.customPermissions]);

  const setActiveShop = useCallback((shop: Shop) => {
    if (state.user?.shopAccess.includes(shop)) {
      localStorage.setItem('rks_activeShop', shop);
      setState(s => ({ ...s, activeShop: shop }));
      window.location.reload();
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


