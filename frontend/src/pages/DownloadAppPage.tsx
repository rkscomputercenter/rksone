import React, { useState } from 'react';
import { Download, CheckCircle, Smartphone, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function DownloadAppPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || !password) {
      setError('Username and password are required.');
      return;
    }

    setLoading(true);
    try {
      // Intentionally not catching 401 interceptor globally for this specific route 
      // by relying on the fact that this route doesn't trigger the 401 redirect if we are careful,
      // but wait, api client intercepts 401 and redirects to login if pathname != '/login'.
      // To bypass that, we can use fetch directly, or just let it redirect (which we don't want).
      // Let's use fetch directly so we don't trigger the global axios 401 logout redirect.
      
      const baseURL = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';
      const res = await fetch(`${baseURL}/auth/verify-download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Invalid credentials');
      }

      // Success
      setDownloadStarted(true);
      
      // Trigger download
      const a = document.createElement('a');
      a.href = data.data.apkUrl;
      a.download = 'Shop_RKS_v1.0.41.apk';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      
      <div style={{ maxWidth: '900px', width: '100%', display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'center' }}>
        
        {/* Left Column - Hero Content */}
        <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-primary)', padding: '8px 16px', borderRadius: '999px', border: '1px solid rgba(99, 102, 241, 0.2)', width: 'fit-content' }}>
            <Smartphone className="w-5 h-5" />
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Official Mobile App</span>
          </div>

          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: 900, lineHeight: 1.1, color: 'var(--text-primary)' }}>
            Shop RKS <br/>
            <span style={{ color: 'var(--color-primary)' }}>on the Go</span>
          </h1>
          
          <p style={{ fontSize: '18px', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '450px' }}>
            Built exclusively for RKS employees.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>
            <ShieldCheck className="w-5 h-5 text-emerald-500" style={{ color: '#10b981' }} />
            <span>Verified Safe Internal Release</span>
          </div>

          <Link to="/" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none', display: 'inline-block', marginTop: '16px' }}>
            ← Back to Home
          </Link>
        </div>

        {/* Right Column - Verification Form & Details */}
        <div style={{ 
          flex: '1 1 400px', 
          background: 'var(--bg-surface)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '24px', 
          padding: '32px', 
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          
          <div>
            <h3 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Download APK</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Verify your employee credentials to start the download. This action is logged securely.</p>
          </div>

          {!downloadStarted ? (
            <form onSubmit={handleDownload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                  placeholder="Enter employee username"
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
                  width: '100%', padding: '16px', background: 'var(--color-primary)', color: '#fff', 
                  border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 700, 
                  marginTop: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                  opacity: loading ? 0.7 : 1, transition: 'all 0.2s', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)'
                }}
              >
                {loading ? <span className="spinner" style={{ width: 20, height: 20 }}></span> : <Download className="w-5 h-5" />}
                {loading ? 'Verifying...' : 'Verify & Download'}
              </button>
            </form>
          ) : (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '24px', borderRadius: '16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#10b981', color: '#fff', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle className="w-6 h-6" />
              </div>
              <h4 style={{ color: '#10b981', fontSize: '18px', fontWeight: 700 }}>Verification Successful</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Your download has started. Please wait a moment.</p>
              
              <button onClick={() => setDownloadStarted(false)} style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginTop: '8px' }}>
                Download again
              </button>
            </div>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '8px 0' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Version</span>
              <span style={{ fontWeight: 600, color: 'var(--color-primary)', background: 'rgba(99, 102, 241, 0.1)', padding: '4px 12px', borderRadius: '8px', fontSize: '13px' }}>v1.0.41</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Size</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>~ 22 MB</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>OS Requirement</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>Android 8.0+</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}










