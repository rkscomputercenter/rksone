import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Layout from '../components/layout/Layout';

export default function RestrictedAccessPage() {
  const navigate = useNavigate();

  return (
    <Layout title="Not available">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center', padding: '0 20px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--stamp-wash)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
          <ShieldAlert style={{ width: '40px', height: '40px', color: 'var(--red)' }} />
        </div>
        <h1 className="page-header-title" style={{ marginBottom: 10 }}>This page isn’t part of your role</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', lineHeight: 1.6, marginBottom: '32px' }}>
          Ask a super admin if you need it; they can change what your account can open.
        </p>
        <button 
          className="btn btn-primary" 
          onClick={() => navigate('/dashboard')}
          
        >
          <ArrowLeft size={18} />
          Back to today
        </button>
      </div>
    </Layout>
  );
}
