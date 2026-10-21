import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { systemApi } from '../../api';

export default function StorageManagement() {
  const [stats, setStats] = useState<{ tables: any[]; totalBytes: number; totalMb: string } | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Manual Cleanup State
  const [manualDate, setManualDate] = useState('');
  const [cleanupTypes, setCleanupTypes] = useState<string[]>(['transactions', 'expenses']);
  const [cleaning, setCleaning] = useState(false);

  // Auto Cleanup Config State
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [autoDuration, setAutoDuration] = useState(3);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [storageRes, configRes] = await Promise.all([
        systemApi.getStorageStats(),
        systemApi.getConfig()
      ]);
      if (storageRes.data?.success && storageRes.data.data) {
        setStats(storageRes.data.data);
      }
      if (configRes.data?.success && configRes.data.data) {
        setConfig(configRes.data.data);
        setAutoEnabled(configRes.data.data.autoCleanupEnabled);
        setAutoDuration(configRes.data.data.autoCleanupDurationMonths);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm('Are you sure you want to update the Auto-Cleanup settings?')) return;
    setSavingConfig(true);
    try {
      await systemApi.updateConfig({ 
        autoCleanupEnabled: autoEnabled, 
        autoCleanupDurationMonths: autoDuration 
      });
      alert('Config saved successfully');
      fetchData();
    } catch (err) {
      alert('Failed to save config');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleToggleSuspend = async () => {
    const newState = !autoEnabled;
    const action = newState ? 'RESUME' : 'SUSPEND';
    if (!confirm(`Are you sure you want to ${action} the auto-cleanup mechanism?`)) return;
    
    setSavingConfig(true);
    try {
      await systemApi.updateConfig({ 
        autoCleanupEnabled: newState, 
        autoCleanupDurationMonths: autoDuration 
      });
      setAutoEnabled(newState);
      alert(`Auto-cleanup has been ${newState ? 'RESUMED' : 'SUSPENDED'}.`);
      fetchData();
    } catch (err) {
      alert(`Failed to ${action.toLowerCase()} auto-cleanup`);
    } finally {
      setSavingConfig(false);
    }
  };

  const calculateTargetDeletionDate = () => {
    if (!config?.nextCleanupDate) return null;
    const target = new Date(config.nextCleanupDate);
    target.setMonth(target.getMonth() - autoDuration);
    return target;
  };

  const handleManualCleanup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDate || cleanupTypes.length === 0) return alert('Select date and at least one type.');
    if (!confirm(`WARNING: This will permanently delete selected data older than ${manualDate}. Proceed?`)) return;

    setCleaning(true);
    try {
      await systemApi.manualCleanup(manualDate, cleanupTypes);
      alert('Cleanup completed successfully!');
      fetchData();
    } catch (err) {
      alert('Failed to run cleanup');
    } finally {
      setCleaning(false);
    }
  };

  const toggleType = (type: string) => {
    setCleanupTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  return (
    <Layout title="Storage Management">
      <div className="container" style={{ maxWidth: 900 }}>
        <h2 style={{ marginBottom: 24 }}>Storage & Cleanup Operations</h2>

        {loading && <p>Loading storage stats...</p>}
        
        {stats && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3>Database Storage Usage</h3>
            <p>Total Managed Size: <strong>{stats.totalMb}</strong></p>
            <table className="table" style={{ marginTop: 16 }}>
              <thead>
                <tr>
                  <th>Table Name</th>
                  <th>Size</th>
                </tr>
              </thead>
              <tbody>
                {stats.tables.map(t => (
                  <tr key={t.table}>
                    <td>{t.table}</td>
                    <td>{t.sizeMb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Auto Cleanup Config */}
          <div className="card">
            <h3>Auto Cleanup Configuration</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Automatically generate Excel archives and delete old data.
            </p>
            
            {config && (
              <div>
                <div style={{
                  padding: 16,
                  borderRadius: 8,
                  marginBottom: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: autoEnabled ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${autoEnabled ? 'var(--color-success)' : 'var(--color-danger)'}`
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Status</div>
                    <div style={{ 
                      fontSize: 20, 
                      fontWeight: 700, 
                      color: autoEnabled ? 'var(--color-success)' : 'var(--color-danger)' 
                    }}>
                      {autoEnabled ? '🟢 ACTIVE' : '🔴 SUSPENDED'}
                    </div>
                  </div>
                  <button 
                    className={`btn ${autoEnabled ? 'btn-danger' : 'btn-primary'}`} 
                    onClick={handleToggleSuspend}
                    disabled={savingConfig}
                  >
                    {savingConfig ? 'Processing...' : (autoEnabled ? 'Suspend All Cleanups' : 'Resume Cleanups')}
                  </button>
                </div>

                <form onSubmit={handleSaveConfig}>
                  <div className="form-group">
                    <label className="form-label">Delete Data Older Than</label>
                    <select className="form-input" value={autoDuration} onChange={e => setAutoDuration(Number(e.target.value))} disabled={!autoEnabled}>
                      <option value={1}>1 Month</option>
                      <option value={2}>2 Months</option>
                      <option value={3}>3 Months</option>
                      <option value={6}>6 Months</option>
                    </select>
                  </div>

                  {autoEnabled && (
                    <div style={{ marginBottom: 16, fontSize: 13, background: 'var(--bg-elevated)', padding: '16px', borderRadius: 8 }}>
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Last Cleanup:</span> <strong style={{ float: 'right' }}>{config.lastCleanupDate ? new Date(config.lastCleanupDate).toLocaleDateString() : 'Never'}</strong>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Next Execution Date:</span> <strong style={{ float: 'right' }}>{config.nextCleanupDate ? new Date(config.nextCleanupDate).toLocaleDateString() : 'Pending Scheduling'}</strong>
                      </div>
                      <hr style={{ margin: '12px 0', borderColor: 'var(--border-color)' }} />
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: 'var(--color-danger)' }}>Target Deletion Date:</span> 
                        <strong style={{ float: 'right', color: 'var(--color-danger)' }}>
                          {calculateTargetDeletionDate() ? `< ${calculateTargetDeletionDate()?.toLocaleDateString()}` : 'N/A'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Target Tables (To Delete):</span> 
                        <strong style={{ float: 'right' }}>Transactions, Expenses</strong>
                      </div>
                      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-success)' }}>
                        * Audit Logs and User Performance Snapshots are safely ignored and will NOT be deleted.
                      </div>
                    </div>
                  )}

                  <button type="submit" className="btn btn-secondary" disabled={savingConfig || !autoEnabled}>
                    {savingConfig ? 'Saving...' : 'Save Configuration'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Manual Cleanup */}
          <div className="card" style={{ border: '1px solid var(--color-danger)' }}>
            <h3 style={{ color: 'var(--color-danger)' }}>Manual Data Purge</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Instantly delete old records without waiting for cron jobs. Analytics snapshots will be automatically generated.
            </p>
            <form onSubmit={handleManualCleanup}>
              <div className="form-group">
                <label className="form-label">Delete data older than:</label>
                <input type="date" className="form-input" value={manualDate} onChange={e => setManualDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Select Tables to Purge:</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="checkbox" checked={cleanupTypes.includes('transactions')} onChange={() => toggleType('transactions')} /> Transactions
                  </label>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="checkbox" checked={cleanupTypes.includes('expenses')} onChange={() => toggleType('expenses')} /> Expenses
                  </label>
                </div>
              </div>
              <button type="submit" className="btn btn-danger" disabled={cleaning || cleanupTypes.length === 0 || !manualDate}>
                {cleaning ? 'Purging...' : 'Execute Manual Purge'}
              </button>
            </form>
          </div>
        </div>

      </div>
    </Layout>
  );
}
