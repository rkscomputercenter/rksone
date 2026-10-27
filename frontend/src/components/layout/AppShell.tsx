import React, { Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { PageLoading } from '../ui/Loading';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ShellContext } from './shellContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import { useAuth } from '../../context/AuthContext';
import { io, Socket } from 'socket.io-client';
import { systemApi } from '../../api';
import { SOCKET_ORIGIN, APP_NAME } from '../../config';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Megaphone } from 'lucide-react';

interface AppShellProps {
  /** Only for a page rendered outside the shell route; normally the routed page comes from <Outlet>. */
  children?: React.ReactNode;
  title?: string;
}

/**
 * The signed-in frame: sidebar, topbar, bottom bar, live updates and the office broadcast.
 * It is one route element around every signed-in page, so moving between pages swaps only
 * the content: the menu, its scroll position and the socket stay as they are.
 */
export default function AppShell({ children, title: fixedTitle }: AppShellProps) {
  const { user, logout, token, activeShop, isAuthenticated } = useAuth();
  const [title, setTitle] = useState(fixedTitle || APP_NAME);
  const shell = useMemo(() => ({ setTitle }), []);
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  // useNavigate changes identity on every route change; effects that must not re-run read it from a ref
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const [broadcast, setBroadcast] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Desktop: the menu button hides the sidebar; the choice is remembered on this device
  const [menuHidden, setMenuHidden] = useState(() => {
    try { return localStorage.getItem('rks_menuHidden') === '1'; } catch { return false; }
  });
  const isPhone = () => window.matchMedia('(max-width: 768px)').matches;
  const toggleMenu = () => {
    if (isPhone()) { setIsMobileMenuOpen(open => !open); return; }
    setMenuHidden(hidden => {
      try { localStorage.setItem('rks_menuHidden', hidden ? '0' : '1'); } catch { /* storage blocked */ }
      return !hidden;
    });
  };

  // Fetch Server Message on Load
  useEffect(() => {
    if (!token) return;
    systemApi.getConfig()
      .then(({ data }) => {
        if (data?.data?.serverMessage) {
          const msg = data.data.serverMessage;
          const dismissed = localStorage.getItem('dismissed_broadcast');
          if (dismissed !== msg) {
            setBroadcast(msg);
          }
        }
      })
      .catch(err => console.error('Failed to fetch system config', err));
  }, [token]);

  // Socket connection
  useEffect(() => {
    // Request Native Notification Permissions
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.requestPermissions().catch(console.error);
    }
    
    // Register Service Worker for Mobile Notifications (Web)
    if ('serviceWorker' in navigator && 'Notification' in window) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    if (!token) return;

    // Connect to Socket.IO
    const socket: Socket = io(SOCKET_ORIGIN, {
      path: '/api/socket.io',
      auth: { token },
      transports: ['websocket']
    });

    socket.on('connect', () => {
      console.log('[SOCKET] Connected to real-time server');
    });

    socket.on('notification', async (data: any) => {
      console.log('[SOCKET] Received notification:', data);
      
      const fireBrowserNotification = async (title: string, body: string) => {
        if (Capacitor.isNativePlatform()) {
          try {
            await LocalNotifications.schedule({
              notifications: [
                {
                  title,
                  body,
                  id: new Date().getTime(),
                  schedule: { at: new Date(Date.now() + 1000) }
                }
              ]
            });
          } catch (e) {
            console.error('Native notification failed', e);
          }
        } else if ('Notification' in window && Notification.permission === 'granted') {
          try {
            if ('serviceWorker' in navigator) {
              const reg = await navigator.serviceWorker.ready;
              reg.showNotification(title, { body, icon: '/favicon.svg', badge: '/favicon.svg' });
            } else {
              new Notification(title, { body, icon: '/favicon.svg' });
            }
          } catch (e) {
            console.error('Web notification failed', e);
          }
        }
      };
      
      if (data.type === 'MESSAGE') {
        setBroadcast(data.message);
        fireBrowserNotification(`${APP_NAME} Broadcast`, data.message);
      } else if (data.type === 'NEW_ALERT') {
        fireBrowserNotification('System Alert', data.payload?.message || 'New system alert received');
      } else if (data.type === 'PERIODIC_UPDATE') {
        const { income, expenses, profit } = data.payload || {};
        const title = 'Today so far';
        const body = `Income: ₹${income || 0}\nExpenses: ₹${expenses || 0}\nProfit: ₹${profit || 0}`;
        
        // Show structured popup in-app
        setBroadcast(`${title}\n\n${body}`);
        
        // Trigger native mobile notification
        fireBrowserNotification(title, `Income: ₹${income || 0} | Expenses: ₹${expenses || 0} | Profit: ₹${profit || 0}`);
      } else if (data.type === 'KICK') {
        alert(data.message || 'Your session has been terminated.');
        logout();
        navigateRef.current('/login');
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [token, logout]);

  // Android status bar: dark icons on the white topbar
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
      StatusBar.setStyle({ style: Style.Light }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#FFFFFF' }).catch(() => {});
    });
  }, []);

  // Android back button and keyboard. Registered once; the handler reads the current state from refs.
  const backState = useRef({ isMobileMenuOpen, broadcast });
  backState.current = { isMobileMenuOpen, broadcast };
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handles: Array<Promise<{ remove: () => Promise<void> }>> = [];

    import('@capacitor/app').then(({ App }) => {
      handles.push(App.addListener('backButton', ({ canGoBack }) => {
        if (backState.current.isMobileMenuOpen) setIsMobileMenuOpen(false);
        else if (backState.current.broadcast) setBroadcast(null);
        else if (canGoBack) window.history.back();
        else App.exitApp();
      }));
    });
    import('@capacitor/keyboard').then(({ Keyboard }) => {
      handles.push(Keyboard.addListener('keyboardWillShow', () => document.body.classList.add('keyboard-open')));
      handles.push(Keyboard.addListener('keyboardWillHide', () => document.body.classList.remove('keyboard-open')));
    });

    return () => { handles.forEach(h => h.then(x => x.remove()).catch(() => {})); };
  }, []);

  // A new page starts at the top, and the browser tab shows its name
  useEffect(() => { mainRef.current?.scrollTo(0, 0); }, [location.pathname]);
  useEffect(() => { document.title = title === APP_NAME ? APP_NAME : `${title}, ${APP_NAME}`; }, [title]);

  // Signed out: no frame; the protected route inside redirects to sign-in
  if (!isAuthenticated) return <>{children ?? <Outlet />}</>;

  return (
    <div className={`app-layout${menuHidden ? ' menu-hidden' : ''}`}>
      <div 
        className={`mobile-backdrop ${isMobileMenuOpen ? 'visible' : ''}`} 
        onClick={() => setIsMobileMenuOpen(false)} 
      />
      <Sidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
        onToggle={toggleMenu}
      />
      <div className="main-content">
        <Topbar 
          title={title || APP_NAME} 
          onMenuClick={toggleMenu}
          menuShown={isMobileMenuOpen || (!menuHidden && typeof window !== 'undefined' && !isPhone())}
        />
        <main ref={mainRef} className="page-content" style={{ flex: 1 }}>
          {broadcast && (
            <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="broadcast-title" style={{ zIndex: 9999 }}>
              <div className="modal" style={{ maxWidth: 440 }}>
                <div className="modal-header" style={{ justifyContent: 'flex-start' }}>
                  <span className="quick-action-icon" aria-hidden="true"><Megaphone size={18} /></span>
                  <h2 id="broadcast-title" className="modal-title">Message from the office</h2>
                </div>
                <div className="modal-body">
                  <p style={{ fontSize: 'var(--fs-lg)', lineHeight: 1.55, whiteSpace: 'pre-line', wordBreak: 'break-word', maxHeight: 260, overflowY: 'auto' }}>
                    {broadcast}
                  </p>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-primary btn-full" onClick={() => {
                    if (broadcast) localStorage.setItem('dismissed_broadcast', broadcast);
                    setBroadcast(null);
                  }}>
                    Got it
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="page-inner">
            <ShellContext.Provider value={shell}>
              {/* keyed by shop: switching shop reloads the page data, not the whole app */}
              {/* the frame stays; only this area shows a placeholder while a page's code is fetched */}
              <Suspense fallback={<PageLoading />}>
                {children ?? <Outlet key={activeShop ?? 'none'} />}
              </Suspense>
            </ShellContext.Provider>
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
