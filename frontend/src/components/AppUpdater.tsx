import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { APP_ORIGIN, API_BASE_URL, APP_NAME } from '../config';

const CURRENT_VERSION = '1.0.41';

export default function AppUpdater() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [apkUrl, setApkUrl] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);

  useEffect(() => {
    // Only check for updates if running as a native app
    if (!Capacitor.isNativePlatform()) return;

    const checkForUpdates = async () => {
      try {
        const response = await fetch(`${APP_ORIGIN}/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) return;

        const data = await response.json();
        
        // Simple string comparison for versions (e.g. '1.0.1' > '1.0.0')
        if (data.version && compareVersions(data.version, CURRENT_VERSION) > 0) {
          setApkUrl(data.apkUrl || `${APP_ORIGIN}/download`);
          setReleaseNotes(data.releaseNotes || 'A new version is available.');
          setUpdateAvailable(true);
        }
      } catch (err) {
        console.error('Failed to check for updates:', err);
      }
    };

    // Check immediately, and then every 2 hours
    checkForUpdates();
    const interval = setInterval(checkForUpdates, 2 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const compareVersions = (v1: string, v2: string) => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || !password) {
      setError('Username and password are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Invalid credentials');
      }

      setDownloadStarted(true);
      
      // Open the download URL in the external device browser so the system can download it properly
      const secureApkUrl = data.data?.apkUrl || apkUrl;
      const urlToOpen = secureApkUrl.startsWith('http') ? secureApkUrl : `${APP_ORIGIN}${secureApkUrl}`;
      window.open(urlToOpen, '_system');
      
    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  if (!updateAvailable) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(10px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '24px',
        padding: '32px',
        maxWidth: '400px',
        width: '100%',
        color: 'var(--text-primary)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ 
          width: '60px', height: '60px', borderRadius: '16px', 
          background: 'rgba(99, 102, 241, 0.2)', display: 'flex', 
          alignItems: 'center', justifyContent: 'center', marginBottom: '24px',
          border: '1px solid rgba(99, 102, 241, 0.5)'
        }}>
          <span style={{ fontSize: '32px' }}>🚀</span>
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>Update Required</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>
          A new version of {APP_NAME} is available. Please authenticate to download the update.
        </p>
        
        {releaseNotes && (
          <div style={{ background: 'var(--bg-base)', padding: '16px', borderRadius: '12px', marginBottom: '24px', borderLeft: '3px solid var(--color-primary)' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{releaseNotes}</p>
          </div>
        )}
        
        {!downloadStarted ? (
          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px', borderRadius: '12px', fontSize: '14px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
                style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '15px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '15px', outline: 'none' }}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 700,
                marginTop: '8px',
                cursor: 'pointer',
                boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.4)',
                transition: 'all 0.2s',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading ? <span className="spinner" style={{ width: 20, height: 20 }}></span> : <span>Verify & Download</span>}
            </button>
          </form>
        ) : (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '24px', borderRadius: '16px', textAlign: 'center' }}>
            <h4 style={{ color: '#10b981', fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0' }}>Success!</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>The update is downloading in your browser.</p>
          </div>
        )}

      </div>
    </div>
  );
}













