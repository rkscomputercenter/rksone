import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import api from '../api/client';

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter your username');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      await api.post('/auth/forgot-password', { username: username.trim() });
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Reset Password</h2>
        <p style={{ color: 'var(--text-muted)' }}>Enter your username to request a password reset from Super Admins.</p>
      </div>

      {success ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Request Sent</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Your password reset request has been sent to Super Admins. Please wait for them to provide you with a new password.</p>
          <Link to="/login" className="btn btn-primary btn-full" style={{ display: 'inline-block', textDecoration: 'none' }}>
            Back to Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {error && (
            <div className="alert alert-error" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px', borderRadius: '12px', fontSize: '14px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              {error}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Username</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. johndoe"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              style={{ height: 48, fontSize: 16 }}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ height: 48, fontSize: 16, marginTop: 8, fontWeight: 700 }}>
            {loading ? 'Sending Request...' : 'Request Password Reset'}
          </button>
          
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <Link to="/login" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
              ← Back to Login
            </Link>
          </div>
        </form>
      )}

      <p style={{ textAlign: 'center', marginTop: 32, fontSize: 12, color: 'var(--text-muted)' }}>
        Need help? Contact <a href="mailto:support.rksshop@gmail.com" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>support.rksshop@gmail.com</a>
      </p>
    </>
  );

  if (Capacitor.isNativePlatform()) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-base)', fontFamily: 'Inter, sans-serif', padding: '24px', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '40px 32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>
          {formContent}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)', fontFamily: 'Inter, sans-serif', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 450, background: 'var(--bg-surface)', padding: '40px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }}>
        {formContent}
      </div>
    </div>
  );
}
