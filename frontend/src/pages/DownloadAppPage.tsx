import React, { useEffect, useState } from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE_URL, APP_NAME } from '../config';

export default function DownloadAppPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [version, setVersion] = useState('');

  useEffect(() => {
    fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => d?.version && setVersion(d.version))
      .catch(() => {});
  }, []);

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }

    setLoading(true);
    try {
      // fetch, not the API client: a wrong password must not trigger the client's sign-out redirect
      const res = await fetch(`${API_BASE_URL}/auth/verify-download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || data.message || 'Wrong username or password.');

      setDownloadStarted(true);
      const a = document.createElement('a');
      a.href = data.data.apkUrl;
      a.download = 'RKS_ONE.apk';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message === 'Failed to fetch' ? 'Can’t reach the server. Check the internet connection.' : (err.message || 'Something went wrong. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 'calc(24px + env(safe-area-inset-top, 0px)) 16px 24px', background: 'var(--paper)' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <Link to="/login" className="btn-link text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 14 }}>
          <ArrowLeft size={15} /> Sign in
        </Link>
        <div className="slip">
          <div className="slip-head">
            <div>
              <h1 className="slip-title">{APP_NAME} for Android</h1>
              <div className="slip-meta">For RKS staff. Sign in to download the app.</div>
            </div>
          </div>

          {downloadStarted ? (
            <>
              <div className="alert alert-success mb-16">
                The download has started. When it finishes, open the file and tap Install. Android may ask you to allow installs from your browser.
              </div>
              <button type="button" className="btn btn-ghost btn-full" onClick={() => setDownloadStarted(false)}>Download again</button>
            </>
          ) : (
            <form onSubmit={handleDownload} noValidate>
              {error && <div className="alert alert-error mb-16" role="alert">{error}</div>}
              <div className="form-group">
                <label className="form-label" htmlFor="dl-user">Username</label>
                <input id="dl-user" className="form-input" type="text" value={username} onChange={e => setUsername(e.target.value)}
                  autoComplete="username" autoCapitalize="none" spellCheck={false} style={{ minHeight: 48 }} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="dl-pass">Password</label>
                <input id="dl-pass" className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password" style={{ minHeight: 48 }} />
              </div>
              <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading} style={{ marginTop: 6 }}>
                {loading ? <><span className="spinner" /> Checking</> : <><Download size={18} /> Download the app</>}
              </button>
            </form>
          )}

          <div style={{ marginTop: 18 }}>
            {version && <div className="slip-line"><span>Version</span><span className="num" style={{ color: 'var(--graphite)' }}>{version}</span></div>}
            <div className="slip-line"><span>Size</span><span style={{ color: 'var(--graphite)' }}>About 22 MB</span></div>
            <div className="slip-line" style={{ borderBottom: 'none' }}><span>Needs</span><span style={{ color: 'var(--graphite)' }}>Android 8 or newer</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
