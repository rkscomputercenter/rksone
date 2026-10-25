import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function MaintenancePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleBackToLogin = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'var(--bg-base)',
      color: 'var(--text-primary)',
      textAlign: 'center',
      padding: 20
    }}>
      <div className="brand-mark" style={{ width: 56, height: 56, fontSize: 22, margin: '0 auto 20px' }} aria-hidden="true">R1</div>
      <h1 className="page-header-title" style={{ marginBottom: 10 }}>RKS ONE is being updated</h1>
      <p style={{ fontSize: 17, color: 'var(--text-secondary)', maxWidth: 520, lineHeight: 1.6, marginBottom: 28 }}>
        Everything you entered is saved. Sales and expenses can be entered again as soon as the update finishes.
      </p>
      
      <div className="card" style={{ maxWidth: 400 }}>
        <p style={{ fontSize: '14px', marginBottom: 20 }}>
          Super admins can still sign in during the update.
        </p>
        <button className="btn btn-primary btn-lg btn-full" onClick={handleBackToLogin}>
          Go to sign in
        </button>
      </div>

      <div style={{ marginTop: 'auto', padding: 40, opacity: 0.5, fontSize: '12px' }}>
        RKS ONE | © 2026 RKS Computer Center. All rights reserved.
      </div>
    </div>
  );
}
