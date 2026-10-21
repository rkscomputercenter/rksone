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
      <div style={{ fontSize: '100px', marginBottom: 20 }}>🛠️</div>
      <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: 12 }}>SERVER UNDER MAINTENANCE</h1>
      <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: 600, lineHeight: 1.6, marginBottom: 32 }}>
        We are currently performing scheduled maintenance to improve our systems. 
        All data has been safely saved. We'll be back online shortly!
      </p>
      
      <div className="card" style={{ maxWidth: 400, border: '2px solid var(--border-default)' }}>
        <p style={{ fontSize: '14px', marginBottom: 20 }}>
          Your session was paused safely. If you are an administrator, you can try logging in again if maintenance is complete.
        </p>
        <button className="btn btn-primary btn-lg btn-full" onClick={handleBackToLogin}>
          Back to Login
        </button>
      </div>

      <div style={{ marginTop: 'auto', padding: 40, opacity: 0.5, fontSize: '12px' }}>
        Version 1.0.0 | © 2026 RKS COMPUTER CENTER. All rights reserved.
      </div>
    </div>
  );
}
