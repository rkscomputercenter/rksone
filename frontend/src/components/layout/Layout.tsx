import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { useTheme } from '../../context/ThemeContext';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function Layout({ children, title }: LayoutProps) {
  const { user, logout, token } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [broadcast, setBroadcast] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
              reg.showNotification(title, { body, icon: '/logo.png', badge: '/logo.png' });
            } else {
              new Notification(title, { body, icon: '/logo.png' });
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
        navigate('/login');
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [token, logout, navigate]);

  // Android status bar follows the theme (white topbar or navy)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
      StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light }).catch(() => {});
      StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#16223F' : '#FFFFFF' }).catch(() => {});
    });
  }, [theme]);

  // Native hardware integrations
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    import('@capacitor/app').then(({ App }) => {
      App.addListener('backButton', ({ canGoBack }) => {
        if (isMobileMenuOpen) {
          setIsMobileMenuOpen(false);
        } else if (broadcast) {
          setBroadcast(null);
        } else if (canGoBack) {
          window.history.back();
        } else {
          // At root level
          App.exitApp();
        }
      });
    });


    import('@capacitor/keyboard').then(({ Keyboard }) => {
      Keyboard.addListener('keyboardWillShow', () => {
        document.body.classList.add('keyboard-open');
      });
      Keyboard.addListener('keyboardWillHide', () => {
        document.body.classList.remove('keyboard-open');
      });
    });

  }, [isMobileMenuOpen, broadcast]);

  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="app-layout">
      <div 
        className={`mobile-backdrop ${isMobileMenuOpen ? 'visible' : ''}`} 
        onClick={() => setIsMobileMenuOpen(false)} 
      />
      <Sidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />
      <div className="main-content">
        <Topbar 
          title={title || APP_NAME} 
          onMenuClick={() => setIsMobileMenuOpen(true)} 
        />
        <main className="page-content" style={{ flex: 1 }}>
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
          <div className="page-inner">{children}</div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
