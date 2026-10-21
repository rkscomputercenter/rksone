import React, { useState, useEffect } from 'react';
import { systemApi } from '../../api';
import Layout from '../../components/layout/Layout';
import { Bell, AlertTriangle, Info, CheckCircle, Trash2, XCircle, RefreshCw, ShieldAlert, Cpu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { io, Socket } from 'socket.io-client';

export default function SystemAlertsPage() {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await systemApi.getAlerts();
      if (res.data.success) {
        setAlerts(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    if (!token) return;
    const socket: Socket = io(window.location.origin, {
      path: '/api/socket.io',
      auth: { token },
      transports: ['websocket']
    });

    socket.on('notification', (data: any) => {
      if (data.type === 'NEW_ALERT' && data.payload) {
        setAlerts(prev => [data.payload, ...prev]);
      }
    });

    return () => { socket.disconnect(); };
  }, [token]);

  const handleMarkRead = async (id: string) => {
    try {
      await systemApi.markAlertRead(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all alerts?')) return;
    try {
      await systemApi.clearAlerts();
      setAlerts([]);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredAlerts = alerts.filter(a => filter === 'ALL' ? true : a.source === filter);

  const getIcon = (type: string, source: string) => {
    if (source === 'LOGIN_ATTEMPT') return <ShieldAlert size={24} />;
    if (type === 'ERROR') return <XCircle size={24} />;
    if (type === 'WARNING') return <AlertTriangle size={24} />;
    if (type === 'SUCCESS') return <CheckCircle size={24} />;
    return <Info size={24} />;
  };

  const getColor = (type: string) => {
    if (type === 'ERROR') return 'var(--color-danger)';
    if (type === 'WARNING') return 'var(--color-warning)';
    if (type === 'SUCCESS') return 'var(--color-success)';
    return 'var(--color-primary)';
  };

  return (
    <Layout title="System Alerts">
      <div className="container" style={{ maxWidth: 1000, margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Bell style={{ color: 'var(--color-primary)' }} size={32} />
              System Alerts & Control
            </h1>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Monitor real-time server events, automatic transactions, and security alerts.</p>
          </div>
          
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary" onClick={fetchAlerts} disabled={loading}>
              <RefreshCw size={18} className={loading ? 'spin' : ''} /> Refresh
            </button>
            <button className="btn btn-danger" onClick={handleClearAll} disabled={alerts.length === 0}>
              <Trash2 size={18} /> Clear All
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {['ALL', 'LOGIN_ATTEMPT', 'AUTO_TRANS', 'SYSTEM'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                border: 'none',
                background: filter === f ? 'var(--color-primary)' : 'var(--bg-elevated)',
                color: filter === f ? 'white' : 'var(--text-primary)',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              {f === 'LOGIN_ATTEMPT' && <ShieldAlert size={16} />}
              {f === 'AUTO_TRANS' && <Cpu size={16} />}
              {f === 'ALL' && <Bell size={16} />}
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Alerts List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {loading && alerts.length === 0 ? (
            <div className="flex-center" style={{ padding: 40, color: 'var(--text-muted)' }}>
              <RefreshCw className="spin" size={32} />
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="card flex-center" style={{ padding: 60, flexDirection: 'column', gap: 16, textAlign: 'center' }}>
              <CheckCircle size={64} style={{ color: 'var(--color-success)', opacity: 0.5 }} />
              <div>
                <h3 style={{ margin: '0 0 8px 0' }}>All Clear!</h3>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>There are no alerts matching this filter.</p>
              </div>
            </div>
          ) : (
            filteredAlerts.map(alert => (
              <div 
                key={alert.id} 
                className="card"
                style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: 16, 
                  padding: 20,
                  borderLeft: `4px solid ${getColor(alert.type)}`,
                  opacity: alert.isRead ? 0.6 : 1,
                  transition: 'opacity 0.2s'
                }}
              >
                <div style={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: '50%', 
                  background: `${getColor(alert.type)}20`,
                  color: getColor(alert.type),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {getIcon(alert.type, alert.source)}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                      {alert.source === 'LOGIN_ATTEMPT' ? 'Security Alert: Failed Login' : 
                       alert.source === 'AUTO_TRANS' ? 'Auto Transaction Update' : 'System Event'}
                    </h3>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(alert.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </span>
                  </div>
                  
                  <p style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {alert.message}
                  </p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {alert.ipAddress && (
                        <span style={{ 
                          fontSize: 12, 
                          background: 'var(--bg-body)', 
                          padding: '4px 8px', 
                          borderRadius: 6,
                          color: 'var(--color-danger)',
                          fontFamily: 'monospace',
                          fontWeight: 600
                        }}>
                          IP: {alert.ipAddress}
                        </span>
                      )}
                      <span style={{ 
                          fontSize: 12, 
                          background: 'var(--bg-body)', 
                          padding: '4px 8px', 
                          borderRadius: 6,
                          color: 'var(--text-muted)'
                        }}>
                          Severity: {alert.type}
                        </span>
                    </div>
                    
                    {!alert.isRead && (
                      <button 
                        onClick={() => handleMarkRead(alert.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-primary)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: 14
                        }}
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
