import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { usersApi, apiClient } from '../../api';
import type { User, Role, Shop } from '../../types';

interface UserModalProps { user?: User; onClose: () => void; onSave: () => void; }

function UserModal({ user, onClose, onSave }: UserModalProps) {
  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(user?.role ?? 'USER');
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [isSuspended, setIsSuspended] = useState(user?.isSuspended ?? false);
  const [customRoleId, setCustomRoleId] = useState<string>(user?.customRoleId ?? '');
  const [shopAccess, setShopAccess] = useState<Shop[]>(user?.shopAccess ?? ['SHOP_COMPUTER']);
  const [customRoles, setCustomRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.get('/roles').then((res: any) => setCustomRoles(res.data.data || [])).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || (!user && !username.trim())) { setError('Name and username required'); return; }
    if (!user && !password) { setError('Password required for new user'); return; }
    setLoading(true);
    try {
      if (user) {
        await usersApi.update(user.id, { name, role, isActive, isSuspended, customRoleId, shopAccess, ...(password && { password }) });
      } else {
        await usersApi.create({ name, username, password, role, isActive, customRoleId, shopAccess });
      }
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Save failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{user ? 'Edit User' : 'Create User'}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ravi Kumar" autoFocus />
            </div>
            {!user && (
              <div className="form-group">
                <label className="form-label">Username</label>
                <input className="form-input" value={username} onChange={e => setUsername(e.target.value.toLowerCase())} placeholder="lowercase, no spaces" />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">{user ? 'New Password (leave blank to keep)' : 'Password'}</label>
              <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={role} onChange={e => setRole(e.target.value as Role)}>
                  <option value="USER">Operator (USER)</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="CUSTOM">Custom Role</option>
                </select>
              </div>
              {role === 'CUSTOM' && (
                <div className="form-group">
                  <label className="form-label">Select Custom Role</label>
                  <select className="form-select" value={customRoleId} onChange={e => setCustomRoleId(e.target.value)} required>
                    <option value="">-- Select Role --</option>
                    {customRoles.map(cr => <option key={cr.id} value={cr.id}>{cr.name}</option>)}
                  </select>
                </div>
              )}
              {role !== 'SUPER_ADMIN' && role !== 'ADMIN' && (
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Shop Access</label>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={shopAccess.includes('SHOP_COMPUTER')}
                        onChange={e => {
                          if (e.target.checked) setShopAccess(prev => [...prev, 'SHOP_COMPUTER']);
                          else setShopAccess(prev => prev.filter(s => s !== 'SHOP_COMPUTER'));
                        }}
                      />
                      <span>SHOP-COMPUTER</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={shopAccess.includes('SHOP_XEROX')}
                        onChange={e => {
                          if (e.target.checked) setShopAccess(prev => [...prev, 'SHOP_XEROX']);
                          else setShopAccess(prev => prev.filter(s => s !== 'SHOP_XEROX'));
                        }}
                      />
                      <span>SHOP-XEROX</span>
                    </label>
                  </div>
                  {shopAccess.length === 0 && <span style={{ fontSize: 12, color: 'var(--red)' }}>Must select at least one shop</span>}
                </div>
              )}
              <div className="form-group" style={{ justifyContent: 'flex-end', gridColumn: '1 / -1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 26 }}>
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Active</span>
                </label>
              </div>
            </div>
            {user && (
              <div className="form-group" style={{ marginTop: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '12px', background: 'rgba(255,50,50,0.1)', borderRadius: 8, border: '1px solid rgba(255,50,50,0.2)' }}>
                  <input type="checkbox" checked={isSuspended} onChange={e => setIsSuspended(e.target.checked)} />
                  <span style={{ fontSize: 14, color: 'var(--red)', fontWeight: 600 }}>Suspend Account</span>
                </label>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save User'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | undefined>();
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    usersApi.list().then(r => setUsers(r.data.data ?? [])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const roleChip = (r: Role) => {
    const cls = r === 'SUPER_ADMIN' ? 'badge-gold' : r === 'ADMIN' ? 'badge-purple' : 'badge-blue';
    return <span className={`badge ${cls}`}>{r.replace(/_/g, ' ')}</span>;
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user? If they have transactions, they will be deactivated instead to preserve records.')) return;
    try {
      const res = await usersApi.delete(id);
      alert(res.data.message || 'User removed');
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  return (
    <Layout title="User Management">
      {showModal && (
        <UserModal user={editUser} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); load(); }} />
      )}
      <div className="page-header">
        <div>
          <div className="page-header-title">User Management</div>
          <div className="page-header-sub">{users.length} users — {users.filter(u => u.isActive).length} active</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditUser(undefined); setShowModal(true); }}>+ Add User</button>
      </div>

      {error && <div className="alert alert-error mb-16">{error}</div>}

      {loading ? <div className="page-loading"><div className="spinner spinner-lg" /></div> : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Transactions</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{u.username}</td>
                  <td>{roleChip(u.role)}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {u.isActive ? <span className="badge badge-green">Active</span> : <span className="badge badge-red">Inactive</span>}
                      {u.isSuspended && <span className="badge badge-red" style={{ background: '#ff3333', color: 'white' }}>Suspended</span>}
                      {u.shopAccess?.length > 1 ? (
                        <span className="badge" style={{ background: '#e0e7ff', color: '#3730a3', fontSize: 10 }}>BOTH SHOPS</span>
                      ) : (
                        <span className="badge" style={{ background: '#f3f4f6', color: '#4b5563', fontSize: 10 }}>{u.shopAccess?.[0]?.replace('SHOP_', '')}</span>
                      )}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{u._count?.transactions ?? 0}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditUser(u); setShowModal(true); }}>✏ Edit</button>
                      <button className="btn btn-ghost btn-sm text-red" onClick={() => handleDelete(u.id)}>🗑 Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
