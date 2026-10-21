import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function DeveloperPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: '40px 20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        
        {/* Navigation Back */}
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => navigate(-1)} className="btn btn-ghost">
            ← Go Back
          </button>
          <Link to="/" className="btn btn-outline" style={{ background: '#fff' }}>
            🏠 Home
          </Link>
        </div>

        {/* Developer Profile Header */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 120,
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)',
            opacity: 0.1
          }} />
          
          <img 
            src="/developer.jpeg" 
            alt="Hemapriyan R K" 
            style={{ 
              width: 150, height: 150, borderRadius: '50%', objectFit: 'cover', 
              border: '4px solid #fff', boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              position: 'relative', zIndex: 1, marginTop: 10
            }} 
          />
          
          <h1 style={{ marginTop: 20, marginBottom: 8, fontSize: 32, fontWeight: 900, color: 'var(--text-primary)' }}>
            HEMAPRIYAN R K
          </h1>
          <h3 style={{ margin: 0, color: 'var(--color-primary)', fontWeight: 600, letterSpacing: 1 }}>
            DEVELOPER
          </h3>

          <div style={{ display: 'flex', gap: 16, marginTop: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
            <a href="mailto:connectwithhemapriyan@gmail.com" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}>
              <svg height="20" width="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              connectwithhemapriyan@gmail.com
            </a>
            <a href="https://github.com/hemapriyan-rk/shop-rks" target="_blank" rel="noreferrer" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
              </svg>
              GitHub Repository
            </a>
            <a href="https://www.linkedin.com/in/hemapriyan-rk" target="_blank" rel="noreferrer" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0A66C2', borderColor: '#0A66C2' }}>
              <svg height="20" width="20" viewBox="0 0 24 24" fill="#fff">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              LinkedIn Profile
            </a>
          </div>
        </div>

        {/* Tech Stack & Architecture */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginTop: 24 }}>
          
          <div className="card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 16, marginBottom: 16 }}>
              <span style={{ fontSize: 24 }}>🛠</span> Core Technology Stack
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <strong style={{ display: 'block', marginBottom: 4, color: 'var(--color-primary)' }}>Frontend Web App</strong>
                <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>React 18, Vite, TypeScript, React Router DOM, Socket.io-client, Recharts for Analytics</span>
              </div>
              
              <div>
                <strong style={{ display: 'block', marginBottom: 4, color: 'var(--color-primary)' }}>Backend Server & API</strong>
                <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Node.js, Express.js, TypeScript, REST APIs, JSON Web Tokens (JWT), Socket.io (Real-time)</span>
              </div>
              
              <div>
                <strong style={{ display: 'block', marginBottom: 4, color: 'var(--color-primary)' }}>Database & ORM</strong>
                <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>PostgreSQL (Relational DB), Prisma ORM (Type-safe schemas and migrations)</span>
              </div>

              <div>
                <strong style={{ display: 'block', marginBottom: 4, color: 'var(--color-primary)' }}>Infrastructure & Deployment</strong>
                <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Render (Cloud Platform), Docker (Containerization)</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 16, marginBottom: 16 }}>
              <span style={{ fontSize: 24 }}>🏗</span> System Architecture
            </h3>
            
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Role-Based Access Control (RBAC):</strong> Strict segregation of duties across Super Admin, Admin, and User roles ensuring data integrity.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Real-Time Data Synchronization:</strong> WebSocket integration via Socket.io to push real-time transaction updates, system bans, and live server broadcasts.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Sliding Window Automated Maintenance:</strong> Background cron engines that automatically execute monthly analytics compilation and sliding-window database cleanups for heavy audit logs.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Dual-Mode Integrity Audit Logging:</strong> Complete system transparency with parallel transaction logs and deep storage analytical systems.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Optimized Frontend Performance:</strong> Highly responsive dashboard designs paired with direct print-spooling native PDF CSS generation.
              </li>
            </ul>
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
          Designed and Engineered by Hemapriyan R K © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
