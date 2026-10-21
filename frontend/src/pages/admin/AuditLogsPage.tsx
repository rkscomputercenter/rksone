import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { logsApi, usersApi } from '../../api';
import type { Log, User } from '../../types';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);

  // Filters
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState('UPDATE,DELETE');

  const load = () => {
    setLoading(true);
    logsApi.list({ tableName: 'transactions', date, ...(userId && { userId }), ...(action && { action }) })
      .then(r => setLogs(r.data.data ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    usersApi.list().then(r => setUsers(r.data.data ?? []));
  }, []);

  useEffect(() => {
    load();
  }, [date, userId, action]);

  return (
    <Layout title="Audit Logs">
      <div className="page-header">
        <div>
          <div className="page-header-title">Audit Logs</div>
          <div className="page-header-sub">Track transaction updates and deletions</div>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input type="date" className="form-input" style={{ width: 160 }} value={date} onChange={e => setDate(e.target.value)} max={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })} />
          
          <select className="form-select" value={userId} onChange={e => setUserId(e.target.value)} style={{ minWidth: 150 }}>
            <option value="">All Users</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.username})</option>
            ))}
          </select>

          <select className="form-select" value={action} onChange={e => setAction(e.target.value)} style={{ minWidth: 150 }}>
            <option value="UPDATE,DELETE">Updates & Deletes</option>
            <option value="UPDATE">Updates Only</option>
            <option value="DELETE">Deletes Only</option>
            <option value="CREATE">Creates</option>
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="page-loading"><div className="spinner" /></div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No logs found</div>
            <div className="empty-state-sub">No matching audit logs for the selected criteria.</div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Record ID</th>
                  <th>Changes / Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const oldData = log.oldValue as any;
                  const newData = log.newValue as any;
                  
                  return (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td>
                        <span className={`badge ${log.action === 'DELETE' ? 'badge-red' : log.action === 'UPDATE' ? 'badge-blue' : 'badge-green'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{log.user.name}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>...{log.recordId.slice(-6)}</td>
                      <td>
                        {log.action === 'DELETE' && oldData && (
                          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            Deleted transaction worth <b>₹{oldData.totalPrice}</b> (Service ID: {oldData.serviceId})
                          </div>
                        )}
                        {log.action === 'UPDATE' && oldData && newData && (
                          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            {oldData.quantity !== newData.quantity && <div>Qty: {oldData.quantity} → {newData.quantity}</div>}
                            {oldData.totalPrice !== newData.totalPrice && <div>Total: ₹{oldData.totalPrice} → ₹{newData.totalPrice}</div>}
                            {oldData.notes !== newData.notes && <div>Notes: {oldData.notes || 'None'} → {newData.notes || 'None'}</div>}
                          </div>
                        )}
                        {log.action === 'CREATE' && newData && (
                          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            Created worth <b>₹{newData.totalPrice}</b> (Qty: {newData.quantity})
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
