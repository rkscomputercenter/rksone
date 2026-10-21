import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

interface PasswordRequest {
  id: string;
  userId: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    username: string;
    role: string;
  };
}

export default function PasswordRequestsPage() {
  const { role } = useAuth();
  const [requests, setRequests] = useState<PasswordRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [resolveModal, setResolveModal] = useState<{ open: boolean; req: PasswordRequest | null }>({ open: false, req: null });
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/password-requests');
      setRequests(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveModal.req) return;
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setProcessingId(resolveModal.req.id);
    setError('');
    try {
      await api.post(`/users/password-requests/${resolveModal.req.id}/resolve`, { newPassword });
      setResolveModal({ open: false, req: null });
      setNewPassword('');
      fetchRequests();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update password');
    } finally {
      setProcessingId(null);
    }
  };

  if (role !== 'SUPER_ADMIN') {
    return (
      <Layout>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <h2>Access Denied</h2>
          <p>You must be a Super Admin to view this page.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-header" style={{ padding: '24px' }}>
        <h1 className="page-title">Password Reset Requests</h1>
      </div>

      <div style={{ padding: '0 24px 24px' }}>
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="card-title">Pending Requests</h2>
            <button className="btn btn-secondary" onClick={fetchRequests} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      No pending requests.
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req.id}>
                      <td>{new Date(req.createdAt).toLocaleString()}</td>
                      <td>{req.user.name}</td>
                      <td>{req.user.username}</td>
                      <td><span className={`badge badge-role-${req.user.role.toLowerCase()}`}>{req.user.role}</span></td>
                      <td><span className="badge badge-warning">{req.status}</span></td>
                      <td>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => { setResolveModal({ open: true, req }); setNewPassword(''); setError(''); }}
                        >
                          Reset Password
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {resolveModal.open && resolveModal.req && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Reset Password for {resolveModal.req.user.name}</h2>
              <button className="icon-btn" onClick={() => setResolveModal({ open: false, req: null })}>×</button>
            </div>
            <div className="modal-content">
              <form onSubmit={handleResolve}>
                {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
                
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    autoFocus
                  />
                  <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                    Make sure to securely communicate this temporary password to the user.
                  </small>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setResolveModal({ open: false, req: null })}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={!!processingId}>
                    {processingId ? 'Updating...' : 'Set Password & Resolve'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
