import { Plus } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { usersApi, apiClient } from '../../api';
import type { User, Role, Shop } from '../../types';
import { PageLoading } from '../../components/ui/Loading';
import { roleLabel } from '../../utils/roleLabel';

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
                  <option value="USER">Staff</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super admin</option>
                  <option value="CUSTOM">Custom role</option>
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
                      <span>Computer shop</span>
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
                      <span>Xerox shop</span>
                    </label>
                  </div>
                  {shopAccess.length === 0 && <span className="form-error">Choose at least one shop.</span>}
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
                <label className="alert alert-error" style={{ cursor: 'pointer', alignItems: 'center' }}>
                  <input type="checkbox" checked={isSuspended} onChange={e => setIsSuspended(e.target.checked)} />
                  <span style={{ fontWeight: 600 }}>Suspend this account. They are signed out and can’t sign in until you clear this.</span>
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
  const [notice, setNotice] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    usersApi.list().then(r => setUsers(r.data.data ?? [])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const roleChip = (r: Role, customRoleName?: string | null) => {
    const cls = r === 'SUPER_ADMIN' || r === 'ADMIN' ? 'badge-gold' : '';
    return <span className={`badge ${cls}`}>{roleLabel(r, customRoleName)}</span>;
  };

  const handleDelete = async (id: string) => {
    try {
      setError(''); setNotice('');
      const res = await usersApi.delete(id);
      setNotice(res.data.message || 'User removed.');
      setConfirmId(null);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'The user was not removed. Try again.');
    }
  };

  return (
    <Layout title="Users">
      {showModal && (
        <UserModal user={editUser} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); load(); }} />
      )}
      <div className="page-header">
        <div>
          <div className="page-header-title">Users</div>
          <div className="page-header-sub">{users.length} people can sign in; {users.filter(u => u.isActive).length} are active.</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditUser(undefined); setShowModal(true); }}><Plus size={17} /> Add a user</button>
      </div>

      {error && <div className="alert alert-error mb-16" role="alert">{error}</div>}
      {notice && <div className="alert alert-success mb-16" aria-live="polite">{notice}</div>}

      {loading ? <PageLoading /> : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Name</th><th>Role</th><th>Shops</th><th>Status</th><th className="amount">Sales entered</th><th className="amount"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{u.name}</div>
                    <div className="text-xs text-muted">{u.username}</div>
                  </td>
                  <td>{roleChip(u.role, u.customRole?.name)}</td>
                  <td className="text-muted">{u.role === 'ADMIN' || u.role === 'SUPER_ADMIN' || (u.shopAccess?.length ?? 0) > 1 ? 'Both' : u.shopAccess?.[0] === 'SHOP_XEROX' ? 'Xerox' : 'Computer'}</td>
                  <td>
                    <span className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                      {u.isActive ? <span className="badge badge-green">Active</span> : <span className="badge">Inactive</span>}
                      {u.isSuspended && <span className="badge badge-red">Suspended</span>}
                    </span>
                  </td>
                  <td className="amount">{u._count?.transactions ?? 0}</td>
                  <td className="amount">
                    {confirmId === u.id ? (
                      <span className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)}>Remove</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setConfirmId(null)}>Keep</button>
                      </span>
                    ) : (
                      <span className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setEditUser(u); setShowModal(true); }}>Edit</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setConfirmId(u.id)} title="People with sales are made inactive instead, so their records stay">Remove</button>
                      </span>
                    )}
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
