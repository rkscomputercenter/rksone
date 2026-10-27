import React, { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { authApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { money } from '../components/sales/SalesLedger';
import { APP_NAME, APP_VERSION } from '../config';
import { PageLoading } from '../components/ui/Loading';
import { roleLabel } from '../utils/roleLabel';

const TABLE_LABEL: Record<string, string> = {
  transactions: 'Sale', expenses: 'Expense', bank_accounts: 'Bank', users: 'User', services: 'Service',
};
const ACTION_LABEL: Record<string, string> = { CREATE: 'added', UPDATE: 'changed', DELETE: 'deleted' };

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
    if (cpForm.newPass.length < 6) { setCpError('The new password needs at least 6 characters.'); return; }
    if (cpForm.newPass !== cpForm.confirm) { setCpError('The two new passwords are different. Type them again.'); return; }
    setCpLoading(true); setCpError(''); setCpMsg('');
    try {
      await authApi.changePassword(cpForm.current, cpForm.newPass);
      setCpMsg('Password changed. Use the new one next time you sign in.');
      setCpForm({ current: '', newPass: '', confirm: '' });
    } catch (err: any) {
      setCpError(err.response?.data?.error || 'The password was not changed. Try again.');
    } finally { setCpLoading(false); }
  };

  const shops = (user?.shopAccess ?? []).map(s => (s === 'SHOP_XEROX' ? 'Xerox' : 'Computer')).join(' and ');

  return (
    <Layout title="Profile">
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        {loading ? (
          <PageLoading />
        ) : (
          <>
            <div className="page-header" style={{ alignItems: 'center' }}>
              <div className="flex gap-16" style={{ alignItems: 'center' }}>
                <div className="avatar" style={{ width: 56, height: 56, fontSize: 22 }} aria-hidden="true">{user?.name?.[0]?.toUpperCase()}</div>
                <div>
                  <div className="page-header-title">{user?.name}</div>
                  <div className="page-header-sub">{roleLabel(role, profile?.customRoleName ?? user?.customRoleName)}, signs in as {user?.username}{shops ? `. ${shops} shop` : ''}</div>
                </div>
              </div>
              <button className="btn btn-ghost" onClick={() => logout()}><LogOut size={16} /> Sign out</button>
            </div>

            <div className="two-col" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
              <section className="card" aria-labelledby="today-title">
                <h2 id="today-title" className="card-title">Your day</h2>
                <div className="dayline" style={{ gridTemplateColumns: '1fr 1fr', margin: '12px 0 18px', boxShadow: 'none' }}>
                  <div className="dayline-cell" style={{ '--cell-color': 'var(--cash)' } as React.CSSProperties}>
                    <div className="dayline-label">Sales</div>
                    <div className="dayline-value" style={{ fontSize: 'var(--fs-2xl)' }}><span className="cur">₹</span>{money(Number(profile?.todayStats?.revenue ?? 0))}</div>
                  </div>
                  <div className="dayline-cell" style={{ '--cell-color': 'var(--ink)', borderTop: 'none', borderLeft: '1px solid var(--rule)' } as React.CSSProperties}>
                    <div className="dayline-label">Entries</div>
                    <div className="dayline-value" style={{ fontSize: 'var(--fs-2xl)' }}>{profile?.todayStats?.transactions ?? 0}</div>
                  </div>
                </div>
                <h3 className="form-label" style={{ marginBottom: 4 }}>Your latest changes</h3>
                {profile?.recentActivity?.length ? (
                  <div className="ledger">
                    {profile.recentActivity.slice(0, 6).map((a: any, i: number) => (
                      <div key={i} className="ledger-row" style={{ gridTemplateColumns: '1fr auto' }}>
                        <div className="ledger-main" style={{ fontWeight: 500 }}>
                          {TABLE_LABEL[a.tableName] ?? a.tableName} {ACTION_LABEL[a.action] ?? a.action.toLowerCase()}
                        </div>
                        <span className="text-xs text-muted" style={{ gridRow: 1, gridColumn: 2 }}>
                          {new Date(a.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : <div className="text-sm text-muted" style={{ padding: '10px 0' }}>Nothing yet.</div>}
              </section>

              <section className="card" aria-labelledby="pw-title">
                <h2 id="pw-title" className="card-title" style={{ marginBottom: 14 }}>Change your password</h2>
                <div aria-live="polite">
                  {cpMsg && <div className="alert alert-success mb-16">{cpMsg}</div>}
                  {cpError && <div className="alert alert-error mb-16" role="alert">{cpError}</div>}
                </div>
                <form onSubmit={handleChangePassword}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cp-current">Current password</label>
                    <input id="cp-current" className="form-input" type="password" required autoComplete="current-password"
                      value={cpForm.current} onChange={e => setCpForm(f => ({ ...f, current: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cp-new">New password</label>
                    <input id="cp-new" className="form-input" type="password" required autoComplete="new-password"
                      value={cpForm.newPass} onChange={e => setCpForm(f => ({ ...f, newPass: e.target.value }))} />
                    <span className="form-hint">At least 6 characters.</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cp-confirm">New password again</label>
                    <input id="cp-confirm" className="form-input" type="password" required autoComplete="new-password"
                      value={cpForm.confirm} onChange={e => setCpForm(f => ({ ...f, confirm: e.target.value }))} />
                  </div>
                  <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 6 }} disabled={cpLoading}>
                    {cpLoading ? <><span className="spinner" /> Changing</> : 'Change password'}
                  </button>
                </form>
              </section>
            </div>
            <p className="text-xs text-muted" style={{ textAlign: 'center', marginTop: 8 }}>{APP_NAME} version {APP_VERSION}</p>
          </>
        )}
      </div>
    </Layout>
  );
}
