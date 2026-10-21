import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function RenderMaintenancePage() {
  const { isSuperAdmin } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" />;
  }

  // Same calculation logic as Topbar
  const calculateRenderUsage = () => {
    const istString = currentTime.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istNow = new Date(istString);
    
    let hoursUsed = 0;
    let daysActive = 0;
    let daysInactive = 0;

    for (let day = 1; day <= istNow.getDate(); day++) {
      const d = new Date(istNow.getFullYear(), istNow.getMonth(), day);
      if (d.getDay() !== 0) { // Mon-Sat
        daysActive++;
        if (day < istNow.getDate()) {
          hoursUsed += 15; // 6 AM to 9 PM is 15 hours
        } else {
          const currentHour = istNow.getHours();
          const currentMinute = istNow.getMinutes();
          if (currentHour >= 6 && currentHour < 21) {
            hoursUsed += (currentHour - 6) + (currentMinute / 60);
          } else if (currentHour >= 21) {
            hoursUsed += 15;
          }
        }
      } else {
        daysInactive++;
      }
    }
    return { 
      used: Math.floor(hoursUsed), 
      remaining: Math.floor(750 - hoursUsed),
      daysActive,
      daysInactive
    };
  };

  const stats = calculateRenderUsage();
  const percentageUsed = Math.min(100, Math.round((stats.used / 750) * 100));

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Render Infrastructure Maintenance</h1>
          <p className="page-header-sub">Super Admin Portal — Understand and monitor your cloud hosting limits</p>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        
        {/* Usage Card */}
        <div className="card" style={{ padding: '24px', background: 'var(--bg-elevated)', borderRadius: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>☁️</span> CURRENT MONTH USAGE
          </h2>
          
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '48px', fontWeight: 900, color: 'var(--color-primary-light)' }}>
              {stats.used}h
            </span>
            <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>/ 750h</span>
          </div>

          <div style={{ width: '100%', height: '12px', background: 'var(--bg-hover)', borderRadius: '6px', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ 
              height: '100%', 
              width: `${percentageUsed}%`, 
              background: percentageUsed > 80 ? 'var(--red)' : 'linear-gradient(90deg, var(--color-primary), var(--color-accent))',
              borderRadius: '6px'
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 600 }}>
            <span style={{ color: 'var(--text-muted)' }}>Utilized: {percentageUsed}%</span>
            <span style={{ color: stats.remaining < 50 ? 'var(--red)' : 'var(--green)' }}>{stats.remaining}h Remaining</span>
          </div>
        </div>

        {/* Schedule Info */}
        <div className="card" style={{ padding: '24px', background: 'var(--bg-elevated)', borderRadius: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⏱️</span> UPTIME SCHEDULE
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '16px', background: 'var(--bg-base)', borderRadius: '12px', borderLeft: '4px solid var(--green)' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Active Hours (Mon - Sat)</div>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>6:00 AM — 8:50 PM IST</div>
              <div style={{ fontSize: '12px', color: 'var(--green)', marginTop: '4px' }}>System automatically pings itself to stay awake</div>
            </div>

            <div style={{ padding: '16px', background: 'var(--bg-base)', borderRadius: '12px', borderLeft: '4px solid var(--text-muted)' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Rest Hours (Nights & Sundays)</div>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>Server is asleep</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Conserves free-tier hours. First login will take ~40s to wake up.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Explainer Section */}
      <div className="card" style={{ padding: '32px', background: 'var(--bg-elevated)', borderRadius: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px' }}>How the Infrastructure Works</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-accent)', marginBottom: '8px' }}>What is Render Free Tier?</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '14px' }}>
              Render is the cloud provider hosting this management system. They offer a generous free tier of exactly <strong>750 hours per month</strong>. If the system is left running 24/7, a 31-day month would consume exactly 744 hours, leaving almost zero room for error. Furthermore, Render automatically puts free web services to "sleep" after 15 minutes of inactivity, which causes a frustrating 40-second delay the next time someone tries to use the system.
            </p>
          </div>

          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-accent)', marginBottom: '8px' }}>The Anti-Sleep Architecture</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '14px' }}>
              To prevent the 40-second cold start delays during your business hours, a specialized background worker (Cron Job) has been built directly into the system. Every 10 minutes, the server securely "pings" its own health endpoint. This artificial traffic tricks Render into believing the system is constantly in use, completely preventing it from spinning down.
            </p>
          </div>

          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-accent)', marginBottom: '8px' }}>Why We Pause on Nights and Sundays</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '14px' }}>
              While we could run the anti-sleep script 24/7, it is safer to conserve your free hours. The cron job is explicitly configured to <strong>only run from Monday to Saturday, between 6:00 AM and 8:50 PM IST</strong> (a 15-hour window). This means on Sundays and late nights, the system goes to sleep. By doing this, we reduce your monthly consumption from ~744 hours down to around <strong>~390 hours</strong>. This guarantees you will never hit your 750-hour limit and keeps your cloud bill strictly at $0.00.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
