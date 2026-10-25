import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../api/client';

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Enter your username.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      await api.post('/auth/forgot-password', { username: username.trim() });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'The request wasn’t sent. Check the connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 'calc(24px + env(safe-area-inset-top, 0px)) 16px 24px', background: 'var(--paper)' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <Link to="/login" className="btn-link text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 14 }}>
          <ArrowLeft size={15} /> Sign in
        </Link>
        <div className="slip">
          <div className="slip-head">
            <div>
              <h1 className="slip-title">Forgot your password?</h1>
              <div className="slip-meta">A super admin sets a new one for you.</div>
            </div>
          </div>

          {success ? (
            <>
              <div className="alert alert-success mb-16">Request sent. A super admin will give you a new password, usually in person or by phone.</div>
              <Link to="/login" className="btn btn-primary btn-lg btn-full">Back to sign in</Link>
            </>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {error && <div className="alert alert-error mb-16" role="alert">{error}</div>}
              <div className="form-group">
                <label className="form-label" htmlFor="fp-user">Username</label>
                <input id="fp-user" className="form-input" type="text" value={username} onChange={e => setUsername(e.target.value)}
                  autoFocus autoComplete="username" autoCapitalize="none" spellCheck={false} style={{ minHeight: 48 }} />
              </div>
              <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading} style={{ marginTop: 6 }}>
                {loading ? <><span className="spinner" /> Sending</> : 'Ask for a new password'}
              </button>
            </form>
          )}
        </div>
        <p className="text-sm text-muted" style={{ marginTop: 20, textAlign: 'center' }}>
          Stuck? Write to <a href="mailto:support.rksshop@gmail.com" className="btn-link">support.rksshop@gmail.com</a>
        </p>
      </div>
    </div>
  );
}
