import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { apiClient as api } from '../../api';
import { PageLoading } from '../../components/ui/Loading';
import type { CustomRole } from '../../types';

type Level = 'none' | 'view' | 'change';
type Permissions = Record<string, { read: boolean; write: boolean }>;

interface ModuleInfo {
  key: string;
  label: string;
  /** What "View" lets the person do, and what "Change" adds. Plain words; the server enforces exactly this. */
  view: string;
  change?: string;
}

// Basic access (dashboard, new sale, new expense, their own entries) is the same for every custom role.
const MODULES: ModuleInfo[] = [
  { key: 'allRecords', label: 'Everyone’s sales and expenses',
    view: 'See all staff’s sales and expenses, and the history of edits and deletions.',
    change: 'Also edit or delete other staff’s entries from today, approve or reject expenses, and have their own expenses approved at once.' },
  { key: 'banks', label: 'Bank book',
    view: 'See every account’s balance and what changed it.',
    change: 'Also add money to an account or take money out.' },
  { key: 'analytics', label: 'Reports and exports',
    view: 'See sales and profit reports, staff performance and the data exports.' },
  { key: 'services', label: 'Price list',
    view: 'Open the services page.',
    change: 'Also add services and change prices, for the shops they work in.' },
  { key: 'expenseCategories', label: 'Expense categories',
    view: 'Open the categories page.',
    change: 'Also add, rename and remove categories.' },
  { key: 'salaryLogs', label: 'System logs',
    view: 'See the audit log and the bill log.' },
];

const levelOf = (p?: { read: boolean; write: boolean }): Level => (p?.write ? 'change' : p?.read ? 'view' : 'none');
const toPermissions = (levels: Record<string, Level>): Permissions =>
  Object.fromEntries(MODULES.map(m => [m.key, { read: levels[m.key] !== 'none', write: levels[m.key] === 'change' }]));

const LEVEL_LABEL: Record<Level, string> = { none: 'No access', view: 'View', change: 'Change' };

/** The modules a role reaches, for its card. */
function reachOf(role: CustomRole) {
  return MODULES.map(m => ({ label: m.label, level: levelOf(role.permissions?.[m.key]) })).filter(x => x.level !== 'none');
}

interface RoleModalProps {
  role?: CustomRole;
  onClose: () => void;
  onSave: () => void;
}

function RoleModal({ role, onClose, onSave }: RoleModalProps) {
  const [name, setName] = useState(role?.name || '');
  const [levels, setLevels] = useState<Record<string, Level>>(
    () => Object.fromEntries(MODULES.map(m => [m.key, levelOf(role?.permissions?.[m.key])]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) { setError('Give the role a name of at least 2 letters.'); return; }
    setSaving(true); setError('');
    try {
      const body = { name: name.trim(), permissions: toPermissions(levels) };
      if (role) await api.patch(`/roles/${role.id}`, body);
      else await api.post('/roles', body);
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.error || 'The role was not saved. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal role-modal" role="dialog" aria-modal="true" aria-labelledby="role-title" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2 id="role-title" className="modal-title">{role ? `Edit ${role.name}` : 'New custom role'}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error" role="alert">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="role-name">Role name</label>
            <input id="role-name" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="For example, Bank clerk" autoFocus />
          </div>

          <p className="text-sm text-muted" style={{ margin: '4px 0 14px' }}>
            Every custom role can already use the dashboard, add sales and expenses, print bills, and see its own entries.
            Choose what it can reach beyond that. A change shows up the next time the person opens the app.
          </p>

          <div className="role-modules">
            {MODULES.map(m => {
              const level = levels[m.key];
              const options: Level[] = m.change ? ['none', 'view', 'change'] : ['none', 'view'];
              return (
                <fieldset key={m.key} className="role-module">
                  <legend className="role-module-name">{m.label}</legend>
                  <div className="seg" role="group" aria-label={`${m.label} access`}>
                    {options.map(o => (
                      <button key={o} type="button" aria-pressed={level === o} onClick={() => setLevels(l => ({ ...l, [m.key]: o }))}>{LEVEL_LABEL[o]}</button>
                    ))}
                  </div>
                  <p className="role-module-help">
                    {level === 'none' ? 'Cannot open this.' : level === 'view' ? m.view : `${m.view} ${m.change}`}
                  </p>
                </fieldset>
              );
            })}
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving' : 'Save role'}</button>
        </div>
      </form>
    </div>
  );
}

export default function RoleManagementPage() {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRole, setEditRole] = useState<CustomRole | undefined>();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/roles')
      .then((r: any) => setRoles(r.data.data ?? []))
      .catch(() => setError('The roles didn’t load. Check the connection and try again.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const remove = async (role: CustomRole) => {
    try {
      setError('');
      await api.delete(`/roles/${role.id}`);
      setConfirmId(null);
      load();
    } catch (err: any) {
      setConfirmId(null);
      setError(err.response?.data?.error || 'The role was not deleted. Try again.');
    }
  };

  return (
    <Layout title="Roles">
      {showModal && (
        <RoleModal role={editRole} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); load(); }} />
      )}

      <div className="page-header">
        <div>
          <div className="page-header-title">Custom roles</div>
          <div className="page-header-sub">Decide what each kind of staff member can reach, then give the role to people on the Users page.</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditRole(undefined); setShowModal(true); }}>
          <Plus size={17} /> New role
        </button>
      </div>

      {error && <div className="alert alert-error mb-16" role="alert">{error}</div>}

      {loading && roles.length === 0 ? <PageLoading rows={3} /> : roles.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-title">No custom roles yet</div>
          <div className="empty-state-sub">A custom role is for someone who needs more than a regular staff account, but not everything an admin has.</div>
        </div>
      ) : (
        <div className="role-list">
          {roles.map(r => {
            const reach = reachOf(r);
            const users = r._count?.users ?? 0;
            return (
              <section key={r.id} className="card role-card" aria-label={r.name}>
                <div className="flex-between" style={{ alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <h2 className="card-title" style={{ fontSize: 'var(--fs-lg)' }}>{r.name}</h2>
                    <div className="text-sm text-muted">{users === 0 ? 'Nobody has this role yet' : `${users} ${users === 1 ? 'person' : 'people'}`}</div>
                  </div>
                  {confirmId === r.id ? (
                    <div className="flex gap-8">
                      <button className="btn btn-danger btn-sm" onClick={() => remove(r)}>Delete</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setConfirmId(null)}>Keep</button>
                    </div>
                  ) : (
                    <div className="flex gap-8">
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditRole(r); setShowModal(true); }}><Pencil size={15} /> Edit</button>
                      <button className="btn btn-ghost btn-sm" disabled={users > 0} title={users > 0 ? 'Give these people another role first' : undefined}
                        onClick={() => setConfirmId(r.id)} aria-label={`Delete ${r.name}`}><Trash2 size={15} /></button>
                    </div>
                  )}
                </div>
                {reach.length === 0 ? (
                  <p className="text-sm text-muted" style={{ margin: '12px 0 0' }}>Regular staff access only.</p>
                ) : (
                  <ul className="role-reach">
                    {reach.map(x => (
                      <li key={x.label}><span>{x.label}</span><span className={`badge ${x.level === 'change' ? 'badge-blue' : ''}`}>{LEVEL_LABEL[x.level]}</span></li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      <style>{`
        .role-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
        .role-card { display: block; }
        .role-reach { list-style: none; margin: 14px 0 0; padding: 0; border-top: 1px solid var(--rule-soft); }
        .role-reach li { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 9px 0; border-bottom: 1px solid var(--rule-soft); font-size: var(--fs-sm); }
        .role-reach li:last-child { border-bottom: none; padding-bottom: 0; }
        .role-modal { max-width: 620px; }
        .role-modules { display: flex; flex-direction: column; gap: 12px; }
        .role-module { border: 1px solid var(--rule); border-radius: var(--radius-lg); padding: 12px 14px 14px; margin: 0; min-width: 0; }
        .role-module-name { font-weight: 650; padding: 0 6px; margin-left: -6px; }
        .role-module-help { margin: 10px 0 0; font-size: var(--fs-sm); color: var(--graphite-2); line-height: 1.5; max-width: 62ch; }
        .role-module .seg { max-width: 100%; }
        @media (max-width: 640px) {
          .role-list { grid-template-columns: 1fr; }
          .role-modal { max-height: 92dvh; display: flex; flex-direction: column; }
          .role-modal .modal-body { overflow-y: auto; min-height: 0; }
          .role-modal .modal-footer { padding-top: 12px; border-top: 1px solid var(--rule-soft); }
          .role-module .seg { display: flex; width: 100%; }
          .role-module .seg button { flex: 1; }
        }
      `}</style>
    </Layout>
  );
}
