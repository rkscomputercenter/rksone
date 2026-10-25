import React, { useEffect, useState } from 'react';
import { Menu, PanelLeftClose } from 'lucide-react';
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

/** Render free tier: 750 h/month; the service is awake Mon–Sat 06:00–21:00 IST. */
function renderUsage() {
  const istNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  let hoursUsed = 0;
  for (let day = 1; day <= istNow.getDate(); day++) {
    const d = new Date(istNow.getFullYear(), istNow.getMonth(), day);
    if (d.getDay() === 0) continue;
    if (day < istNow.getDate()) hoursUsed += 15;
    else if (istNow.getHours() >= 21) hoursUsed += 15;
    else if (istNow.getHours() >= 6) hoursUsed += (istNow.getHours() - 6) + istNow.getMinutes() / 60;
  }
  return { used: Math.floor(hoursUsed), remaining: Math.floor(750 - hoursUsed) };
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
      <button className="mobile-menu-btn icon-btn" onClick={onMenuClick} aria-expanded={menuShown} aria-controls="main-menu"
        aria-label={menuShown ? 'Hide menu' : 'Show menu'} title={menuShown ? 'Hide menu' : 'Show menu'}>
        {menuShown ? <PanelLeftClose size={20} /> : <Menu size={20} />}
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
          <div className="render-stats-widget hide-mobile" title="Render free tier hours this month">
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
