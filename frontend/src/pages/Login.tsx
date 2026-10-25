import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Smartphone } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../context/AuthContext';
import { APP_NAME } from '../config';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState(() => localStorage.getItem('rks_savedUsername') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Older versions kept the password in plain text here; never store it.
    localStorage.removeItem('rks_savedPassword');
  }, []);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) { setError('Enter your username and password.'); return; }

    setLoading(true);
    try {
      await login(username.trim(), password);
      localStorage.setItem('rks_savedUsername', username.trim());
      navigate('/dashboard');
    } catch (err: any) {
      const serverError = err.response?.data?.error || err.response?.data?.message;
      const networkError = err.response ? null : 'Can’t reach the server. Check the internet connection and try again.';
      setError(serverError || networkError || 'Sign-in failed. Check your username and password.');
    } finally { setLoading(false); }
  };

  const isSuspended = !!error && error.toLowerCase().includes('suspended');
  const isApp = Capacitor.isNativePlatform() || navigator.userAgent.includes('RKS-Desktop-App');

  return (
    <div className="login-page">
      <section className="login-intro">
        <div className="login-brand">
          <div className="brand-mark" aria-hidden="true">R1</div>
          <div className="brand-name" style={{ fontSize: 'var(--fs-xl)' }}>{APP_NAME}</div>
        </div>
        <p className="login-lede">
          Sales counter, expenses and bank book for RKS Xerox &amp; Computer Center, Harur.
        </p>
        {!isApp && (
          <Link to="/download" className="btn btn-ghost" style={{ alignSelf: 'flex-start' }}>
            <Smartphone size={17} /> Get the Android app
          </Link>
        )}
        <p className="login-foot">
          Staff and admins only. Sign-in attempts are recorded.{' '}
          <Link to="/developer" className="btn-link">About this app</Link>
        </p>
      </section>

      <section className="login-form-wrap">
        <form className="slip login-slip" onSubmit={handleSubmit} noValidate>
          <div className="slip-head">
            <div>
              <h1 className="slip-title">Sign in</h1>
              <div className="slip-meta">Use the username your admin gave you.</div>
            </div>
          </div>

          {error && !isSuspended && <div className="alert alert-error mb-16" role="alert">{error}</div>}
          {isSuspended && (
            <div className="alert alert-warning mb-16" role="alert">
              <div>
                <strong>Your account is suspended.</strong>
                <div>Ask a super admin to restore it, then sign in again.</div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input id="username" className="form-input" type="text" value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus={!username} autoComplete="username" autoCapitalize="none" spellCheck={false}
              style={{ minHeight: 48 }} />
          </div>

          <div className="form-group">
            <div className="flex-between">
              <label className="form-label" htmlFor="password">Password</label>
              <Link to="/forgot-password" className="btn-link text-sm">Forgot password?</Link>
            </div>
            <div style={{ position: 'relative' }}>
              <input id="password" className="form-input" type={showPassword ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                autoFocus={!!username} autoComplete="current-password"
                style={{ minHeight: 48, paddingRight: 48 }} />
              <button type="button" className="icon-btn" onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{ position: 'absolute', right: 6, top: 6 }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading} style={{ marginTop: 6 }}>
            {loading ? <><span className="spinner" /> Signing in</> : 'Sign in'}
          </button>
        </form>
      </section>

      <style>{`
        .login-page {
          min-height: 100vh; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          background: var(--paper);
        }
        .login-intro {
          display: flex; flex-direction: column; gap: 22px; justify-content: center;
          padding: 48px clamp(24px, 6vw, 96px);
          border-right: 1px solid var(--rule);
          background:
            repeating-linear-gradient(to bottom, transparent 0 39px, var(--rule-soft) 39px 40px),
            var(--sheet);
        }
        .login-brand { display: flex; align-items: center; gap: 12px; }
        .login-brand .brand-mark { width: 44px; height: 44px; font-size: 18px; }
        .login-lede {
          font-size: clamp(26px, 3.2vw, 40px); font-weight: 600; font-stretch: 85%;
          line-height: 1.15; letter-spacing: -0.015em; max-width: 15em; color: var(--graphite);
        }
        .login-foot { font-size: var(--fs-sm); color: var(--graphite-3); max-width: 34em; }
        .login-form-wrap { display: flex; align-items: center; justify-content: center; padding: 48px 24px; }
        .login-slip { width: 100%; max-width: 400px; }
        @media (max-width: 860px) {
          .login-page { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
          .login-intro { border-right: none; border-bottom: 1px solid var(--rule); padding: calc(28px + env(safe-area-inset-top, 0px)) 20px 24px; gap: 14px; }
          .login-lede { font-size: 22px; }
          .login-foot { display: none; }
          .login-form-wrap { align-items: flex-start; padding: 32px 16px 40px; }
        }
      `}</style>
    </div>
  );
}
