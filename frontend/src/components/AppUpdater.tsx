import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Download } from 'lucide-react';
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
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="update-title" style={{ zIndex: 99999 }}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header" style={{ justifyContent: 'flex-start' }}>
          <span className="quick-action-icon" aria-hidden="true"><Download size={18} /></span>
          <h2 id="update-title" className="modal-title">Update {APP_NAME}</h2>
        </div>
        <div className="modal-body">
          <p className="text-muted">A new version of the app is ready. Sign in to download it; your data stays as it is.</p>
          {releaseNotes && <div className="alert alert-info">{releaseNotes}</div>}

          {!downloadStarted ? (
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {error && <div className="alert alert-error" role="alert">{error}</div>}
              <div className="form-group">
                <label className="form-label" htmlFor="upd-user">Username</label>
                <input id="upd-user" className="form-input" type="text" autoCapitalize="none" autoComplete="username"
                  value={username} onChange={e => setUsername(e.target.value)} style={{ minHeight: 48 }} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="upd-pass">Password</label>
                <input id="upd-pass" className="form-input" type="password" autoComplete="current-password"
                  value={password} onChange={e => setPassword(e.target.value)} style={{ minHeight: 48 }} />
              </div>
              <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
                {loading ? <><span className="spinner" /> Checking</> : 'Download the update'}
              </button>
            </form>
          ) : (
            <div className="alert alert-success">The update is downloading. Open it from your notifications to install.</div>
          )}
        </div>
      </div>
    </div>
  );
}
