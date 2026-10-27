import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Download } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { APP_ORIGIN, API_BASE_URL, APP_NAME, APP_VERSION } from '../config';
import { compareVersions } from '../utils/version';
import { AppUpdate, type UpdateStatus } from '../native/appUpdate';

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

const mb = (bytes: number) => (bytes / 1_000_000).toFixed(1);

/**
 * Update manager for the Android app. The app is a bundle of the web app, so a new web version
 * only reaches phones as a new APK. It asks <web app>/version.json whether one exists.
 *
 * From 1.0.44 the app downloads the APK itself, in the background, as soon as it knows about it
 * (when the person is signed in; otherwise after they type their password), shows the progress, and
 * opens Android's installer when they tap Install. If the native updater is missing or the download
 * fails for good, "Open in browser" falls back to the phone's browser, which is how 1.0.42 did it.
 * The web version never shows this: it is always the latest.
 */
export default function AppUpdater() {
  const { isAuthenticated } = useAuth();
  const [release, setRelease] = useState<Release | null>(null);
  const [hidden, setHidden] = useState(false);
  const [username, setUsername] = useState(() => { try { return localStorage.getItem('rks_savedUsername') || ''; } catch { return ''; } });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [browserStarted, setBrowserStarted] = useState(false);
  const [native, setNative] = useState<boolean | null>(null);   // null: not known yet
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [opened, setOpened] = useState(false);
  const checking = useRef(false);
  const autoTried = useRef('');

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

  // Is the native updater here, and what has it already done? (A download can finish while the app is closed.)
  useEffect(() => {
    if (!release || native !== null) return;
    AppUpdate.status()
      .then(s => { setNative(true); setStatus(s); })
      .catch(() => setNative(false));
  }, [release, native]);

  // Progress and results from the Android side
  useEffect(() => {
    if (!native) return;
    const handles = (['progress', 'ready', 'failed'] as const).map(e => AppUpdate.addListener(e, setStatus));
    return () => { handles.forEach(h => h.then(x => x.remove()).catch(() => {})); };
  }, [native]);

  const forced = !!release?.minVersion && compareVersions(release.minVersion, APP_VERSION) > 0;
  const mine = !!release && status?.version === release.version;
  const phase: 'none' | 'downloading' | 'ready' | 'failed' =
    !mine ? 'none' : status!.state === 'downloading' ? 'downloading' : status!.state === 'ready' ? 'ready' : status!.state === 'error' ? 'failed' : 'none';

  const absolute = (apkUrl: string) => (apkUrl.startsWith('http') ? apkUrl : `${APP_ORIGIN}${apkUrl}`);

  /** Hands the link to the phone's browser: the 1.0.42 way, kept as a fallback. */
  const openInBrowser = (apkUrl: string) => {
    window.open(absolute(apkUrl), '_system');
    setBrowserStarted(true);
  };

  const beginDownload = useCallback(async (apkUrl: string) => {
    if (!release) return;
    try {
      setStatus(await AppUpdate.download({ url: absolute(apkUrl), version: release.version }));
    } catch (err: any) {
      setError(err?.message || 'The download could not start. Try again.');
    }
  }, [release]);

  /** The signed-in person's link (the server notes the download for the super admins). */
  const linkForSignedIn = useCallback(async () => {
    const res = await api.get('/auth/app-download');
    return (res.data?.data?.apkUrl as string) || release?.apkUrl || '/download';
  }, [release]);

  // Start downloading by itself as soon as a signed-in person's phone knows about the update
  useEffect(() => {
    if (!release || !native || !isAuthenticated) return;
    if (mine && status && status.state !== 'idle' && status.state !== 'error') return;   // already going, or done
    if (autoTried.current === release.version) return;
    autoTried.current = release.version;
    linkForSignedIn().then(beginDownload).catch(() => { /* shows the Download button instead */ });
  }, [release, native, isAuthenticated, mine, status, linkForSignedIn, beginDownload]);

  const install = useCallback(async () => {
    setError('');
    try {
      const r = await AppUpdate.install();
      setNeedsPermission(r.needsPermission);
      setOpened(r.started);
    } catch (err: any) {
      setError(err?.message || 'Could not open the installer. Try again.');
    }
  }, []);

  // Back from Android's "allow installs" screen: carry on with the install
  useEffect(() => {
    if (!needsPermission) return;
    const h = CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
      if (!isActive) return;
      try { if ((await AppUpdate.canInstall()).allowed) { setNeedsPermission(false); install(); } } catch { /* ask again on the next return */ }
    });
    return () => { h.then(x => x.remove()).catch(() => {}); };
  }, [needsPermission, install]);

  if (!release || (hidden && !forced)) return null;

  const retry = async () => {
    setError(''); setBusy(true);
    try { await beginDownload(await linkForSignedIn()); }
    catch (err: any) { setError(err.response?.data?.error || 'Could not start the download. Check the internet connection and try again.'); }
    finally { setBusy(false); }
  };

  const downloadWithPassword = async (e: React.FormEvent) => {
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
      const url = data.data?.apkUrl || release.apkUrl || '/download';
      if (native) await beginDownload(url); else openInBrowser(url);
    } catch (err: any) {
      setError(err.message === 'Failed to fetch' ? 'Can’t reach the server. Check the internet connection.' : (err.message || 'Something went wrong. Try again.'));
    } finally { setBusy(false); }
  };

  const later = () => {
    try { localStorage.setItem(LATER_KEY, JSON.stringify({ version: release.version, until: Date.now() + LATER_FOR_MS })); } catch { /* storage blocked */ }
    setHidden(true);
  };

  const received = status?.received ?? 0;
  const total = status?.total ?? 0;
  const percent = total > 0 ? Math.min(100, Math.round((received / total) * 100)) : 0;

  const passwordForm = (
    <form onSubmit={downloadWithPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
  );

  let body: React.ReactNode;
  if (browserStarted) {
    body = (
      <div className="alert alert-success">
        The download has started in your browser. When it finishes, open the file and tap Install. If Android asks, allow installs from that browser.
      </div>
    );
  } else if (native === false) {
    // No native updater on this phone: the browser route
    body = isAuthenticated ? (
      <>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <button className="btn btn-primary btn-lg btn-full" disabled={busy} onClick={async () => {
          setBusy(true); setError('');
          try { openInBrowser(await linkForSignedIn()); }
          catch (err: any) { setError(err.response?.data?.error || 'Could not start the download. Check the internet connection and try again.'); }
          finally { setBusy(false); }
        }}>
          {busy ? <><span className="spinner" /> Starting</> : 'Update now'}
        </button>
      </>
    ) : passwordForm;
  } else if (phase === 'ready') {
    body = (
      <>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {needsPermission && (
          <div className="alert alert-info" role="status">
            Android needs your OK first. On the screen that opened, turn on “Allow from this source” for {APP_NAME}, then come back here.
          </div>
        )}
        {opened && !needsPermission && (
          <div className="alert alert-info" role="status">Follow Android’s prompt to finish. If nothing opened, tap Install again.</div>
        )}
        <button className="btn btn-primary btn-lg btn-full" onClick={install}>
          {opened ? 'Install again' : 'Install now'}
        </button>
        <p className="text-sm text-muted" style={{ margin: '10px 0 0' }}>The update is downloaded ({mb(total)} MB). Android will ask you to confirm.</p>
      </>
    );
  } else if (phase === 'downloading') {
    body = (
      <div role="status" aria-live="polite">
        <div className="flex-between text-sm" style={{ marginBottom: 8 }}>
          <span>Downloading the update</span>
          <span className="text-muted">{total > 0 ? `${mb(received)} of ${mb(total)} MB` : `${mb(received)} MB`}</span>
        </div>
        <div className={`dl-bar${total > 0 ? '' : ' indeterminate'}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
          <span style={{ width: `${percent}%` }} />
        </div>
        <p className="text-sm text-muted" style={{ margin: '10px 0 0' }}>
          {forced ? 'This takes a moment. Keep the app open.' : 'You can keep working. Install appears here when it’s ready.'}
        </p>
      </div>
    );
  } else if (phase === 'failed') {
    body = (
      <>
        <div className="alert alert-error" role="alert">{status?.error || error || 'The download did not finish.'}</div>
        {isAuthenticated
          ? <button className="btn btn-primary btn-lg btn-full" disabled={busy} onClick={retry}>{busy ? <><span className="spinner" /> Starting</> : 'Try again'}</button>
          : passwordForm}
        <button type="button" className="btn btn-ghost btn-full" style={{ marginTop: 8 }}
          onClick={async () => { try { openInBrowser(isAuthenticated ? await linkForSignedIn() : (release.apkUrl || '/download')); } catch { setError('Could not start the download.'); } }}>
          Download in the browser instead
        </button>
      </>
    );
  } else if (isAuthenticated) {
    // Signed in: the download starts by itself; this covers the moment before it does (or if it could not)
    body = error ? (
      <>
        <div className="alert alert-error" role="alert">{error}</div>
        <button className="btn btn-primary btn-lg btn-full" disabled={busy} onClick={retry}>Try again</button>
      </>
    ) : (
      <div role="status" aria-live="polite">
        <div className="flex-between text-sm" style={{ marginBottom: 8 }}><span>Getting the update ready</span></div>
        <div className="dl-bar indeterminate"><span /></div>
      </div>
    );
  } else {
    body = passwordForm;
  }

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
          {body}
        </div>
        {!forced && !browserStarted && phase !== 'downloading' && (
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={later}>Later</button>
          </div>
        )}
      </div>
    </div>
  );
}
