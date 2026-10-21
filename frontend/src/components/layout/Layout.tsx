import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import { useAuth } from '../../context/AuthContext';
import { io, Socket } from 'socket.io-client';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { FcAdvertising } from 'react-icons/fc';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function Layout({ children, title }: LayoutProps) {
  const { user, logout, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [broadcast, setBroadcast] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch Server Message on Load
  useEffect(() => {
    if (!token) return;
    fetch('/api/system/config')
      .then(r => r.json())
      .then(data => {
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
    const socket: Socket = io(window.location.origin, {
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
        fireBrowserNotification('RKS Broadcast', data.message);
      } else if (data.type === 'NEW_ALERT') {
        fireBrowserNotification('System Alert', data.payload?.message || 'New system alert received');
      } else if (data.type === 'PERIODIC_UPDATE') {
        const { income, expenses, profit } = data.payload || {};
        const title = '💰 Daily Financial Update';
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

    import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#13131A' }).catch(() => {});
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
          title={title || 'RKS Management'} 
          onMenuClick={() => setIsMobileMenuOpen(true)} 
        />
        <main className="page-content" style={{ flex: 1 }}>
          {broadcast && (
            <div style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
              padding: '24px',
              animation: 'fadeIn 0.3s ease-out'
            }}>
              <div style={{ 
                maxWidth: 450, 
                width: '100%', 
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 20px rgba(var(--color-primary-rgb), 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}>
                <div style={{ 
                  background: 'linear-gradient(135deg, var(--color-primary), #ff8c00)',
                  padding: '32px 24px',
                  textAlign: 'center',
                  color: 'white'
                }}>
                  <div style={{ 
                    fontSize: 56, 
                    marginBottom: 16,
                    filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))'
                  }}><FcAdvertising size={56} /></div>
                  <h2 style={{ 
                    margin: 0, 
                    fontSize: 24, 
                    fontWeight: 900, 
                    letterSpacing: '-0.5px',
                    textTransform: 'uppercase'
                  }}>System Notification</h2>
                </div>
                
                <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                  <div style={{ 
                    maxHeight: '200px', 
                    overflowY: 'auto', 
                    marginBottom: '32px',
                    padding: '0 8px'
                  }}>
                    <p style={{ 
                      fontSize: 18, 
                      lineHeight: 1.6, 
                      margin: 0, 
                      color: 'var(--text-primary)',
                      fontWeight: 500,
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-line'
                    }}>
                      {broadcast}
                    </p>
                  </div>
                  
                  <button 
                    className="btn btn-primary btn-lg" 
                    style={{ 
                      width: '100%', 
                      borderRadius: '14px',
                      height: '56px',
                      fontSize: '18px',
                      fontWeight: 700,
                      boxShadow: '0 10px 15px -3px rgba(var(--color-primary-rgb), 0.3)'
                    }}
                    onClick={() => {
                      if (broadcast) localStorage.setItem('dismissed_broadcast', broadcast);
                      setBroadcast(null);
                    }}
                  >
                    Acknowledged
                  </button>
                  
                  <div style={{ marginTop: 20, fontSize: 11, color: 'var(--text-muted)', opacity: 0.6 }}>
                    RKS MANAGEMENT SYSTEM • SECURE REAL-TIME
                  </div>
                </div>
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
