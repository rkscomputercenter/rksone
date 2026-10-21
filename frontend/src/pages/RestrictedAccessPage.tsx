import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Layout from '../components/layout/Layout';

export default function RestrictedAccessPage() {
  const navigate = useNavigate();

  return (
    <Layout title="Access Restricted">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center', padding: '0 20px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
          <ShieldAlert style={{ width: '40px', height: '40px', color: 'var(--red)' }} />
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '12px' }}>Access Restricted</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', lineHeight: 1.6, marginBottom: '32px' }}>
          You do not have the required permissions to view this page. If you believe this is an error, please contact your Super Administrator.
        </p>
        <button 
          className="btn btn-primary" 
          onClick={() => navigate('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px' }}
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>
      </div>
    </Layout>
  );
}
