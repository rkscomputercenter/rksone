import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Download } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { APP_ORIGIN, API_BASE_URL, APP_NAME, APP_VERSION } from '../config';
import { compareVersions } from '../utils/version';

/** <web app>/version.json: what the newest app is, and the oldest one still allowed to run. */
interface Release {
  version: string;
  /** Apps older than this must update before they can be used (the popup has no "Later"). */
  minVersion?: string;
  apkUrl?: string;
  releaseNotes?: string;
}

const LATER_KEY = 'rks_updateLater';
const LATER_FOR_MS = 6 * 60 * 60 * 1000;   // "Later" hides the popup for 6 hours
const RECHECK_MS = 2 * 60 * 60 * 1000;     // and the app asks again every 2 hours

const snoozed = (version: string) => {
  try {
    const saved = JSON.parse(localStorage.getItem(LATER_KEY) || 'null');
    return saved?.version === version && Date.now() < saved.until;
  } catch { return false; }
};

/**
 * Update manager for the Android app. The app is a bundle of the web app, so a new web version
 * only reaches phones as a new APK. It asks <web app>/version.json whether one exists, shows a
 * popup when it does, and downloads the APK. Someone who is signed in updates in one tap (no
 * password); someone who isn't types a username and password. The web version never shows this:
 * it is always the latest.
 */
export default function AppUpdater() {
  const { isAuthenticated } = useAuth();
  const [release, setRelease] = useState<Release | null>(null);
  const [hidden, setHidden] = useState(false);
  const [username, setUsername] = useState(() => { try { return localStorage.getItem('rks_savedUsername') || ''; } catch { return ''; } });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const checking = useRef(false);

  const check = useCallback(async () => {
    if (checking.current) return;
    checking.current = true;
    try {
      const res = await fetch(`${APP_ORIGIN}/version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data: Release = await res.json();
      if (data.version && compareVersions(data.version, APP_VERSION) > 0) {
        setRelease(data);
        setHidden(snoozed(data.version));
      } else {
        setRelease(null);
      }
    } catch {
      // Offline or the site is down: try again at the next check
    } finally {
      checking.current = false;
    }
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    check();
    const timer = setInterval(check, RECHECK_MS);
    // Also when the person comes back to the app
    const resume = CapacitorApp.addListener('appStateChange', ({ isActive }) => { if (isActive) check(); });
    resume.catch(() => {}); // no resume hook on this device: the 2-hour check still runs
    return () => { clearInterval(timer); resume.then(h => h.remove()).catch(() => {}); };
  }, [check]);

  if (!release || hidden) return null;

  const forced = !!release.minVersion && compareVersions(release.minVersion, APP_VERSION) > 0;

  const openApk = (apkUrl: string) => {
    const url = apkUrl.startsWith('http') ? apkUrl : `${APP_ORIGIN}${apkUrl}`;
    window.open(url, '_system'); // the phone's browser downloads it; the app itself can't install an APK
    setStarted(true);
  };

  const updateSignedIn = async () => {
    setBusy(true); setError('');
    try {
      const res = await api.get('/auth/app-download');
      openApk(res.data?.data?.apkUrl || release.apkUrl || '/download');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not start the download. Check the internet connection and try again.');
    } finally { setBusy(false); }
  };

  const updateWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) { setError('Enter your username and password.'); return; }
    setBusy(true);
    try {
      // fetch, not the API client: a wrong password must not trigger its sign-out redirect
      const res = await fetch(`${API_BASE_URL}/auth/verify-download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || data.message || 'Wrong username or password.');
      setPassword('');
      openApk(data.data?.apkUrl || release.apkUrl || '/download');
    } catch (err: any) {
      setError(err.message === 'Failed to fetch' ? 'Can’t reach the server. Check the internet connection.' : (err.message || 'Something went wrong. Try again.'));
    } finally { setBusy(false); }
  };

  const later = () => {
    try { localStorage.setItem(LATER_KEY, JSON.stringify({ version: release.version, until: Date.now() + LATER_FOR_MS })); } catch { /* storage blocked */ }
    setHidden(true);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="update-title" style={{ zIndex: 99999 }}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header" style={{ justifyContent: 'flex-start' }}>
          <span className="quick-action-icon" aria-hidden="true"><Download size={18} /></span>
          <h2 id="update-title" className="modal-title">{forced ? `Update ${APP_NAME} to keep working` : `A new ${APP_NAME} is ready`}</h2>
        </div>
        <div className="modal-body">
          <p className="text-muted">
            Version {release.version} is out; this phone has {APP_VERSION}.
            {forced ? ' This version is too old to keep running, so the update is needed now.' : ' Your sales and settings stay as they are.'}
          </p>
          {release.releaseNotes && <div className="alert alert-info">{release.releaseNotes}</div>}

          {started ? (
            <div className="alert alert-success">
              The download has started in your browser. When it finishes, open the file and tap Install. If Android asks, allow installs from that browser.
            </div>
          ) : isAuthenticated ? (
            <>
              {error && <div className="alert alert-error" role="alert">{error}</div>}
              <button className="btn btn-primary btn-lg btn-full" disabled={busy} onClick={updateSignedIn}>
                {busy ? <><span className="spinner" /> Starting</> : 'Update now'}
              </button>
            </>
          ) : (
            <form onSubmit={updateWithPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p className="text-sm text-muted" style={{ margin: 0 }}>Sign in to download the update.</p>
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
              <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={busy}>
                {busy ? <><span className="spinner" /> Checking</> : 'Download the update'}
              </button>
            </form>
          )}
        </div>
        {!forced && !started && (
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={later}>Later</button>
          </div>
        )}
      </div>
    </div>
  );
}
