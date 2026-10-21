import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

import type { Shop } from '../../types';

interface TopbarProps { title: string; onMenuClick: () => void; }

export default function Topbar({ title, onMenuClick }: TopbarProps) {
  const { user, role, activeShop, setActiveShop } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit'
      }));
    };
    update();
    const tInterval = setInterval(update, 1000);
    return () => clearInterval(tInterval);
  }, []);

  const calculateRenderUsage = () => {
    const now = new Date();
    // Adjust to IST for calculation
    const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istNow = new Date(istString);
    
    let hoursUsed = 0;
    for (let day = 1; day <= istNow.getDate(); day++) {
      const d = new Date(istNow.getFullYear(), istNow.getMonth(), day);
      if (d.getDay() !== 0) { // Mon-Sat
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
      }
    }
    return { used: Math.floor(hoursUsed), remaining: Math.floor(750 - hoursUsed) };
  };

  const renderStats = role === 'SUPER_ADMIN' ? calculateRenderUsage() : null;

  return (
    <header className="topbar">
      <button className="mobile-menu-btn text-muted" onClick={onMenuClick} style={{ fontSize: '20px', padding: '4px' }}>
        ☰
      </button>
      <span className="topbar-title">{title}</span>
      
      <div className="flex-center gap-12" style={{ marginLeft: 'auto' }}>
        {user && user.shopAccess.length > 1 && (
          <select 
            value={activeShop || ''} 
            onChange={(e) => setActiveShop(e.target.value as Shop)}
            className="input"
            style={{ padding: '4px 8px', fontSize: '12px', minWidth: '130px', height: '28px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <option value="SHOP_COMPUTER">SHOP COMPUTER</option>
            <option value="SHOP_XEROX">SHOP XEROX</option>
          </select>
        )}
        {user && user.shopAccess.length === 1 && (
          <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '12px', backgroundColor: 'var(--primary)', color: '#fff', fontWeight: 'bold', letterSpacing: '0.5px' }}>
            {activeShop?.replace('_', ' ')}
          </span>
        )}
        {renderStats && (
          <div className="render-stats-widget">
            <span className="render-stats-label">RENDER FREE TIER</span>
            <span className="render-stats-value" style={{ color: renderStats.remaining < 50 ? 'var(--red)' : 'var(--green)' }}>
              {renderStats.used}h <span className="hide-mobile">used</span> • {renderStats.remaining}h <span className="hide-mobile">left</span>
            </span>
          </div>
        )}
        
        <span className="topbar-time" style={{ display: window.innerWidth < 768 ? 'none' : 'inline' }}>{time} IST</span>
        
        <button onClick={toggleLanguage} className="btn-icon text-muted" title={t('topbar.toggleLanguage')} style={{ fontSize: '15px', fontWeight: 800 }}>
          {language === 'en' ? 'அ' : 'A'}
        </button>

        <button onClick={() => toggleTheme(role)} className="btn-icon text-muted" title={t('topbar.toggleTheme')} style={{ fontSize: '18px' }}>
          {theme === 'light' ? '🌙' : theme === 'dark' ? ((role === 'ADMIN' || role === 'SUPER_ADMIN') ? '🔮' : '☀️') : theme === 'glass' ? (role === 'SUPER_ADMIN' ? '✨' : '☀️') : '☀️'}
        </button>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{user?.name}</span>
      </div>
    </header>
  );
}
