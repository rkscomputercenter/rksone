import React, { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import { authApi } from '../api';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user, role, logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cpForm, setCpForm] = useState({ current: '', newPass: '', confirm: '' });
  const [cpMsg, setCpMsg] = useState('');
  const [cpError, setCpError] = useState('');
  const [cpLoading, setCpLoading] = useState(false);

  useEffect(() => {
    authApi.me()
      .then(r => setProfile(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cpForm.newPass !== cpForm.confirm) { setCpError('Passwords do not match'); return; }
    if (cpForm.newPass.length < 6) { setCpError('Min 6 characters'); return; }
    setCpLoading(true); setCpError(''); setCpMsg('');
    try {
      await authApi.changePassword(cpForm.current, cpForm.newPass);
      setCpMsg('Password changed successfully');
      setCpForm({ current: '', newPass: '', confirm: '' });
    } catch (err: any) {
      setCpError(err.response?.data?.error || 'Failed to change password');
    } finally { setCpLoading(false); }
  };

  return (
    <Layout title="My Profile">
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
        {loading ? (
          <div className="page-loading"><div className="spinner spinner-lg" /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Header / Identity */}
            <div className="card" style={{ 
              background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-base) 100%)',
              border: '1px solid rgba(255,255,255,0.05)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ 
                position: 'absolute', 
                top: -50, 
                right: -50, 
                width: 200, 
                height: 200, 
                background: 'var(--color-primary-glow)', 
                filter: 'blur(80px)', 
                borderRadius: '50%',
                opacity: 0.3
              }} />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, position: 'relative', zIndex: 1 }}>
                <div style={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: '24px', 
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: 32, 
                  fontWeight: 900, 
                  color: 'white',
                  boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px' }}>{user?.name}</h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                    <span className="text-muted" style={{ fontSize: 14 }}>@{user?.username}</span>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text-muted)', opacity: 0.3 }} />
                    <span className={`badge role-${role}`} style={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 800 }}>{role}</span>
                  </div>
                </div>
                <button className="btn btn-ghost" style={{ color: 'var(--red)' }} onClick={() => logout()}>Logout</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
              
              {/* Performance Stats */}
              <div className="card">
                <h3 className="section-title">Today's Performance</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ padding: 16, background: 'rgba(var(--color-primary-rgb), 0.05)', borderRadius: 12, border: '1px solid rgba(var(--color-primary-rgb), 0.1)' }}>
                    <div className="text-muted text-xs mb-4">REVENUE</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-accent)' }}>
                      ₹{Number(profile?.todayStats?.revenue ?? 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
                    <div className="text-muted text-xs mb-4">ENTRIES</div>
                    <div style={{ fontSize: 24, fontWeight: 900 }}>
                      {profile?.todayStats?.transactions ?? 0}
                    </div>
                  </div>
                </div>

                <div className="mt-24">
                  <h4 className="text-xs text-muted mb-12" style={{ letterSpacing: '1px', textTransform: 'uppercase' }}>Recent Activity</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {profile?.recentActivity?.slice(0, 5).map((a: any, i: number) => (
                      <div key={i} className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: 13 }}>
                          <span style={{ 
                            padding: '2px 6px', 
                            borderRadius: 4, 
                            fontSize: 10, 
                            fontWeight: 800, 
                            marginRight: 8,
                            background: a.action === 'CREATE' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: a.action === 'CREATE' ? 'var(--green)' : 'var(--red)'
                          }}>{a.action}</span>
                          {a.tableName}
                        </div>
                        <span className="text-muted text-xs">{new Date(a.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))}
                    {!profile?.recentActivity?.length && <div className="text-muted text-center py-12 text-sm italic">No recent activity</div>}
                  </div>
                </div>
              </div>

              {/* Security */}
              <div className="card">
                <h3 className="section-title">Security & Account</h3>
                <div className="alert alert-info mb-20" style={{ fontSize: 12, padding: '10px 14px' }}>
                  Keep your account secure by using a strong password.
                </div>
                
                {cpMsg && <div className="alert alert-success mb-16">{cpMsg}</div>}
                {cpError && <div className="alert alert-error mb-16">{cpError}</div>}

                <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Current Password</label>
                    <input 
                      className="form-input" 
                      type="password" 
                      required
                      placeholder="••••••••"
                      value={cpForm.current} 
                      onChange={e => setCpForm(f => ({ ...f, current: e.target.value }))} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input 
                      className="form-input" 
                      type="password" 
                      required
                      placeholder="At least 6 characters"
                      value={cpForm.newPass} 
                      onChange={e => setCpForm(f => ({ ...f, newPass: e.target.value }))} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm New Password</label>
                    <input 
                      className="form-input" 
                      type="password" 
                      required
                      placeholder="••••••••"
                      value={cpForm.confirm} 
                      onChange={e => setCpForm(f => ({ ...f, confirm: e.target.value }))} 
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ height: 48, borderRadius: 12, fontWeight: 700 }}
                    disabled={cpLoading}
                  >
                    {cpLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>

            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
