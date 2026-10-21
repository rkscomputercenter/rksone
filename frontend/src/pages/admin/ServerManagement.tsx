import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { systemApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { SystemConfig, Session } from '../../types';

export default function ServerManagement() {
  const { user } = useAuth();
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [broadcastToAll, setBroadcastToAll] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [confRes, sessRes, healthRes] = await Promise.all([
        systemApi.getConfig(),
        systemApi.getSessions(),
        systemApi.getHealthStats()
      ]);
      
      if (confRes.data?.data) setConfig(confRes.data.data);
      if (sessRes.data?.data) setSessions(sessRes.data.data);
      if (healthRes.data?.data) setHealth(healthRes.data.data);
    } catch (err: any) {
      console.error('ServerManagement Load Error:', err);
      setError(err.response?.data?.error || 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); 
    return () => clearInterval(interval);
  }, []);

  const handleToggleMaintenance = async () => {
    if (!config) return;
    try {
      await systemApi.updateConfig({ maintenanceMode: !config.maintenanceMode });
      loadData();
    } catch (err) { alert('Failed to update maintenance mode'); }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config || !config.serverMessage) return;
    try {
      await systemApi.updateConfig({ 
        serverMessage: config.serverMessage,
        broadcastToAll 
      });
      alert('Message broadcasted!');
    } catch (err) { alert('Failed to broadcast'); }
  };

  const [kickSessionId, setKickSessionId] = useState<string | null>(null);
  const [kickTimeout, setKickTimeout] = useState<number>(10);
  const [kickMessage, setKickMessage] = useState<string>('You have been timed out by an administrator.');

  const handleKick = (id: string) => {
    setKickSessionId(id);
  };

  const confirmKick = async () => {
    if (!kickSessionId) return;
    try {
      // Backend kickSession expects (id, timeout). If we want to send a custom message during kick,
      // we might need to modify the backend or just rely on backend's message which is
      // `You have been kicked for ${timeout} minutes.`. 
      // Actually, since the prompt asked for a warning message, we can just message the user FIRST, then kick them.
      if (kickMessage) {
        const sessionToKick = sessions.find(s => s.id === kickSessionId);
        if (sessionToKick) {
          await systemApi.messageUser(sessionToKick.userId, kickMessage);
        }
      }
      await systemApi.kickSession(kickSessionId, kickTimeout);
      setKickSessionId(null);
      loadData();
    } catch (err) { alert('Failed to kick session'); }
  };

  const handleMessageUser = async (userId: string) => {
    const msg = prompt('Enter message for this user:');
    if (!msg) return;
    try {
      await systemApi.messageUser(userId, msg);
      alert('Message sent!');
    } catch (err) { alert('Failed to send message'); }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 GB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const formatTime = (t: string | undefined) => {
    if (!t) return '--:--';
    const d = new Date(t);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const now = Date.now();
  const activeSessions = sessions.filter(s => (now - new Date(s.lastSeen).getTime()) < 120000);
  const inactiveSessions = sessions.filter(s => (now - new Date(s.lastSeen).getTime()) >= 120000);

  return (
    <Layout title="Server Management">
      {kickSessionId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div style={{ background: 'var(--bg-surface)', padding: 32, borderRadius: 16, maxWidth: 400, width: '90%', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Timeout Session</h3>
            <div className="form-group">
              <label className="form-label">Timeout Duration (minutes)</label>
              <input type="number" className="form-input" value={kickTimeout} onChange={e => setKickTimeout(parseInt(e.target.value) || 0)} min="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Warning Message</label>
              <input type="text" className="form-input" value={kickMessage} onChange={e => setKickMessage(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setKickSessionId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmKick}>Confirm Timeout</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ padding: '24px 32px' }}>
        <div className="flex-between mb-24">
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Server Management</h2>
          <button className="btn btn-ghost" onClick={loadData} disabled={loading}>
            {loading ? '...' : '🔄 Refresh Stats'}
          </button>
        </div>

        {error && <div className="alert alert-error mb-24">{error}</div>}

        {/* System Health Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 24 }}>
          <div className="card" style={{ borderTop: '4px solid var(--green)' }}>
            <div className="text-xs text-muted mb-8">SERVER STATUS</div>
            <div className="flex-between">
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)' }}>ONLINE</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Uptime: {formatUptime(health?.uptime)}</div>
            </div>
          </div>
          <div className="card" style={{ borderTop: '4px solid var(--blue)' }}>
            <div className="text-xs text-muted mb-8">CPU USAGE</div>
            <div className="flex-between mb-4">
              <div style={{ fontSize: 20, fontWeight: 800 }}>{health?.cpuUsage?.toFixed(1) || 0}%</div>
              <div className="text-xs text-muted">Active Speed</div>
            </div>
            <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${health?.cpuUsage || 0}%`, background: 'var(--blue)' }} />
            </div>
          </div>
          <div className="card" style={{ borderTop: '4px solid var(--color-primary)' }}>
            <div className="text-xs text-muted mb-8">RAM USAGE</div>
            <div className="flex-between mb-4">
              <div style={{ fontSize: 20, fontWeight: 800 }}>{health?.memUsage?.percent?.toFixed(1) || 0}%</div>
              <div className="text-xs text-muted">{formatSize(health?.memUsage?.used)} / {formatSize(health?.memUsage?.total)}</div>
            </div>
            <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${health?.memUsage?.percent || 0}%`, background: 'var(--color-primary)' }} />
            </div>
          </div>
          <div className="card" style={{ borderTop: '4px solid var(--yellow)' }}>
            <div className="text-xs text-muted mb-8">DISK USAGE</div>
            <div className="flex-between mb-4">
              <div style={{ fontSize: 20, fontWeight: 800 }}>{health?.diskUsage?.percent?.toFixed(1) || 0}%</div>
              <div className="text-xs text-muted">{formatSize(health?.diskUsage?.used)} / {formatSize(health?.diskUsage?.size)}</div>
            </div>
            <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${health?.diskUsage?.percent || 0}%`, background: 'var(--yellow)' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 24 }}>
          {/* Maintenance */}
          <div className="card">
            <h3 className="section-title">System Configuration</h3>
            <div className="flex-between mb-16">
              <div>
                <div className="text-xs text-muted">Maintenance Mode</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: config?.maintenanceMode ? 'var(--red)' : 'var(--green)' }}>
                  {config?.maintenanceMode ? 'ACTIVE' : 'INACTIVE'}
                </div>
              </div>
              <button 
                className={`btn ${config?.maintenanceMode ? 'btn-success' : 'btn-danger'}`}
                onClick={handleToggleMaintenance}
              >
                {config?.maintenanceMode ? 'Turn OFF' : 'Turn ON'}
              </button>
            </div>
            <div className="divider" style={{ margin: '12px 0' }} />
            <div className="flex-between">
              <div className="text-xs text-muted">Deployment</div>
              <div className="font-bold" style={{ fontSize: 12 }}>Render · Single Container</div>
            </div>
          </div>

          {/* Broadcast */}
          <div className="card">
            <h3 className="section-title">Global Broadcast</h3>
            <form onSubmit={handleBroadcast}>
              <div className="form-group mb-12">
                <input 
                  className="form-input"
                  value={config?.serverMessage || ''}
                  onChange={e => setConfig(c => c ? ({ ...c, serverMessage: e.target.value }) : null)}
                  placeholder="Message to all users..."
                />
              </div>
              <div className="flex-between">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, cursor: 'pointer' }}>
                  <input type="checkbox" checked={broadcastToAll} onChange={e => setBroadcastToAll(e.target.checked)} />
                  Incl. Super Admin
                </label>
                <button type="submit" className="btn btn-primary" disabled={!config?.serverMessage}>Broadcast</button>
              </div>
            </form>
          </div>
        </div>

        {/* Sessions Split */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
          {/* Active Now Card */}
          <div className="card">
            <h3 className="section-title" style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 1.5s infinite' }} />
              Live Users ({activeSessions.length})
            </h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSessions.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{s.user.name} {s.userId === user?.id && <span className="text-muted">(You)</span>}</div>
                        <div className="text-xs text-muted">@{s.user.username}</div>
                      </td>
                      <td><span className={`badge role-${s.user.role}`}>{s.user.role}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost btn-xs" onClick={() => handleMessageUser(s.userId)}>💬</button>
                          <button className="btn btn-danger btn-xs" onClick={() => handleKick(s.id)} disabled={s.userId === user?.id}>Timeout</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Last Seen Card */}
          <div className="card">
            <h3 className="section-title" style={{ color: 'var(--text-muted)' }}>Idle Sessions ({inactiveSessions.length})</h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Last Seen</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {inactiveSessions.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{s.user.name}</div>
                        <div className="text-xs text-muted">@{s.user.username}</div>
                      </td>
                      <td className="text-xs">{formatTime(s.lastSeen)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-danger btn-xs" onClick={() => handleKick(s.id)}>Timeout</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Network Info */}
        <div className="card mt-24">
          <h3 className="section-title">Network Activity</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
            <div className="flex-between">
              <div className="text-muted text-sm">Download (RX)</div>
              <div className="font-bold">{(health?.network?.rx / (1024 * 1024)).toFixed(2)} MB</div>
            </div>
            <div className="flex-between">
              <div className="text-muted text-sm">Upload (TX)</div>
              <div className="font-bold">{(health?.network?.tx / (1024 * 1024)).toFixed(2)} MB</div>
            </div>
            <div className="flex-between">
              <div className="text-muted text-sm">Interface Status</div>
              <div className="badge badge-green" style={{ color: 'var(--green)' }}>{health?.network?.status?.toUpperCase() || 'UP'}</div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
