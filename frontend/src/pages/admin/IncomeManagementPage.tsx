import React, { useState } from 'react';
import Layout from '../../components/layout/Layout';
import { analyticsApi } from '../../api';

export default function IncomeManagementPage() {
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) { setError('Please select a date'); return; }
    if (!amount || parseFloat(amount) <= 0) { setError('Please specify a valid positive amount'); return; }

    setSubmitting(true);
    setError('');
    
    try {
      await analyticsApi.manualAdjust({
        date,
        type,
        amount: parseFloat(amount),
        note: note.trim()
      });
      
      setSuccess(`Successfully added ₹${amount} as ${type === 'INCOME' ? 'Income' : 'Expense'} to ${date}`);
      setAmount('');
      setNote('');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to apply adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout title="Income Management">
      <div className="page-header">
        <div>
          <div className="page-header-title">Analytical Adjustments</div>
          <div className="page-header-sub">Super Admin tool to manually adjust daily analytics data</div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div className="alert alert-warning" style={{ marginBottom: 24 }}>
          ⚠️ <strong>Warning:</strong> Adjustments made here are permanent and will instantly alter the Analytics charts for the selected date. This creates native transactions/expenses to keep math accurate.
        </div>

        {error && <div className="alert alert-error mb-16">{error}</div>}
        {success && <div className="alert alert-success mb-16">✅ {success}</div>}

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Adjustment Date</label>
              <input 
                type="date" 
                className="form-input" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                disabled={submitting}
                max={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Adjustment Type</label>
              <div style={{ display: 'flex', gap: 12 }}>
                <label 
                  className="type-toggle" 
                  style={{ 
                    flex: 1, padding: 12, border: '2px solid var(--border-color)', borderRadius: 8, 
                    textAlign: 'center', cursor: 'pointer', fontWeight: 600,
                    ...(type === 'INCOME' ? { borderColor: 'var(--green)', background: 'rgba(34,197,94,0.08)', color: 'var(--green)' } : { color: 'var(--text-muted)' })
                  }}
                  onClick={() => setType('INCOME')}
                >
                  📈 Add Income
                </label>
                <label 
                  className="type-toggle" 
                  style={{ 
                    flex: 1, padding: 12, border: '2px solid var(--border-color)', borderRadius: 8, 
                    textAlign: 'center', cursor: 'pointer', fontWeight: 600,
                    ...(type === 'EXPENSE' ? { borderColor: 'var(--red)', background: 'rgba(239,68,68,0.08)', color: 'var(--red)' } : { color: 'var(--text-muted)' })
                  }}
                  onClick={() => setType('EXPENSE')}
                >
                  📉 Add Expense
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input 
                type="number" 
                className="form-input" 
                placeholder="0.00" 
                min="1"
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Reason / Notes</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Missed offline transaction, Tax adjustment..." 
                value={note} 
                onChange={e => setNote(e.target.value)} 
                disabled={submitting}
              />
            </div>

            <button 
              type="submit" 
              className={`btn ${type === 'INCOME' ? 'btn-primary' : 'btn-danger'}`}
              style={{ width: '100%', marginTop: 12, padding: 14, fontSize: 16 }}
              disabled={submitting}
            >
              {submitting ? 'Applying Adjustment...' : `Confirm ${type === 'INCOME' ? 'Income' : 'Expense'} Adjustment`}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
