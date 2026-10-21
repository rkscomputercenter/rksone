import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { apiClient as api } from '../../api';
import type { CustomRole } from '../../types';

interface RoleModalProps {
  role?: CustomRole;
  onClose: () => void;
  onSave: () => void;
}

const DEFAULT_PERMISSIONS = {
  services: { read: false, write: false },
  expenseCategories: { read: false, write: false },
  banks: { read: false, write: false },
  analytics: { read: false, write: false },
  allRecords: { read: false, write: false },
  salaryLogs: { read: false, write: false },
};

function RoleModal({ role, onClose, onSave }: RoleModalProps) {
  const [name, setName] = useState(role?.name || '');
  const [permissions, setPermissions] = useState<Record<string, { read: boolean; write: boolean }>>(
    role?.permissions || DEFAULT_PERMISSIONS
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const togglePerm = (module: string, type: 'read' | 'write') => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [type]: !prev[module]?.[type],
        // If write is enabled, force read to true
        ...(type === 'write' && !prev[module]?.write ? { read: true } : {})
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Role name is required'); return; }
    
    setLoading(true);
    try {
      if (role) {
        await api.patch(`/roles/${role.id}`, { name, permissions });
      } else {
        await api.post('/roles', { name, permissions });
      }
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const modules = [
    { key: 'services', label: 'Services' },
    { key: 'expenseCategories', label: 'Expense Categories' },
    { key: 'banks', label: 'Banks & Config' },
    { key: 'analytics', label: 'Analytics & Exports' },
    { key: 'allRecords', label: 'All Transactions/Expenses' },
    { key: 'salaryLogs', label: 'Salary & System Logs' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <span className="modal-title">{role ? 'Edit Custom Role' : 'Create Custom Role'}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}
            
            <div className="form-group">
              <label className="form-label">Role Name</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Data Entry" autoFocus />
            </div>

            <h4 style={{ marginTop: 24, marginBottom: 12, color: 'var(--text-secondary)' }}>Module Permissions</h4>
            
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '50%' }}>Module</th>
                    <th>Read Visibility</th>
                    <th>Write Capability</th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map(mod => (
                    <tr key={mod.key}>
                      <td style={{ fontWeight: 500 }}>{mod.label}</td>
                      <td>
                        <input type="checkbox" checked={permissions[mod.key]?.read || false} onChange={() => togglePerm(mod.key, 'read')} disabled={permissions[mod.key]?.write} />
                      </td>
                      <td>
                        <input type="checkbox" checked={permissions[mod.key]?.write || false} onChange={() => togglePerm(mod.key, 'write')} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 12 }}>
              Note: Custom Roles automatically inherit standard USER access (Dashboard, New Transaction, New Expense). Use these toggles to grant them Admin-level pages.
            </p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Role'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RoleManagementPage() {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRole, setEditRole] = useState<CustomRole | undefined>();
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/roles').then((r: any) => setRoles(r.data.data ?? [])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (role: CustomRole) => {
    if ((role._count?.users ?? 0) > 0) {
      alert('Cannot delete this role because users are assigned to it.');
      return;
    }
    if (!window.confirm('Delete this custom role?')) return;
    
    try {
      await api.delete(`/roles/${role.id}`);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  return (
    <Layout title="Role Management">
      {showModal && (
        <RoleModal role={editRole} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); load(); }} />
      )}
      
      <div className="page-header">
        <div>
          <div className="page-header-title">Role Management</div>
          <div className="page-header-sub">Create dynamic Custom Roles</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditRole(undefined); setShowModal(true); }}>+ Create Role</button>
      </div>

      {error && <div className="alert alert-error mb-16">{error}</div>}

      {loading ? <div className="page-loading"><div className="spinner spinner-lg" /></div> : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Role Name</th><th>Assigned Users</th><th>Created At</th><th>Actions</th></tr></thead>
            <tbody>
              {roles.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td>{r._count?.users ?? 0}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditRole(r); setShowModal(true); }}>✏ Edit</button>
                      <button className="btn btn-ghost btn-sm text-red" onClick={() => handleDelete(r)}>🗑 Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {roles.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px' }}>No custom roles created.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
