import React, { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

import type { Shop } from '../../types';

interface TopbarProps {
  title: string;
  onMenuClick: () => void;
  /** Whether the menu is showing, for the button label and icon */
  menuShown: boolean;
}

const SHOP_LABEL: Record<Shop, string> = { SHOP_COMPUTER: 'Computer', SHOP_XEROX: 'Xerox' };

/**
 * Render free tier: 750 h/month. The API keeps itself awake around the clock (KEEP_AWAKE=always), so every
 * hour of the month counts. (Estimate from the calendar: Render's own usage page has the exact figure.)
 */
function renderUsage() {
  const istNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const startOfMonth = new Date(istNow.getFullYear(), istNow.getMonth(), 1);
  const hoursUsed = Math.min(750, (istNow.getTime() - startOfMonth.getTime()) / 3_600_000);
  return { used: Math.floor(hoursUsed), remaining: Math.max(0, Math.floor(750 - hoursUsed)) };
}

export default function Topbar({ title, onMenuClick, menuShown }: TopbarProps) {
  const { user, role, activeShop, setActiveShop } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit',
    }));
    update();
    const timer = setInterval(update, 15_000);
    return () => clearInterval(timer);
  }, []);

  const renderStats = role === 'SUPER_ADMIN' ? renderUsage() : null;
  const shops = (user?.shopAccess ?? []) as Shop[];

  return (
    <header className="topbar">
      <button className="menu-toggle" onClick={onMenuClick} aria-expanded={menuShown} aria-controls="main-menu"
        aria-label={menuShown ? 'Hide menu' : 'Show menu'} title={menuShown ? 'Hide menu' : 'Show menu'}>
        <Menu size={22} strokeWidth={2.2} />
      </button>
      <h1 className="topbar-title">{title}</h1>

      <div className="topbar-tools">
        {shops.length > 1 && (
          <div className="seg" role="group" aria-label="Shop">
            {shops.map(shop => (
              <button key={shop} type="button" aria-pressed={activeShop === shop} onClick={() => setActiveShop(shop)}>
                {SHOP_LABEL[shop]}
              </button>
            ))}
          </div>
        )}
        {shops.length === 1 && activeShop && <span className="shop-tag">{SHOP_LABEL[activeShop as Shop]}</span>}

        {renderStats && (
          <div className="render-stats-widget hide-mobile" title="Estimate of the Render free hours used this month, with the server awake day and night">
            <span className="render-stats-label">Server hours</span>
            <span className="render-stats-value" style={{ color: renderStats.remaining < 50 ? 'var(--stamp)' : 'var(--graphite-2)' }}>
              {renderStats.used} used, {renderStats.remaining} left
            </span>
          </div>
        )}

        <span className="topbar-time">{time}</span>

        <button onClick={toggleLanguage} className="icon-btn" title={t('topbar.toggleLanguage')}
          aria-label={language === 'en' ? 'Switch to Tamil' : 'Switch to English'}>
          {language === 'en' ? 'அ' : 'A'}
        </button>

      </div>
    </header>
  );
}
