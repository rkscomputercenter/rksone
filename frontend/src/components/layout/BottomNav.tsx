import React from 'react';
import { NavLink } from 'react-router-dom';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { LayoutDashboard, ListOrdered, Plus, Wallet, Landmark, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const haptic = (style: ImpactStyle) => () => {
  if (Capacitor.isNativePlatform()) Haptics.impact({ style }).catch(() => {});
};

const item = ({ isActive }: { isActive: boolean }) => `bottom-nav-item${isActive ? ' active' : ''}`;

/** Phone navigation: the New sale button sits in the middle, under the thumb. */
export default function BottomNav() {
  const { isAdmin } = useAuth();
  const light = haptic(ImpactStyle.Light);

  return (
    <nav className="bottom-nav hide-desktop" aria-label="Quick navigation">
      <div className="bottom-nav-container">
        <NavLink to="/dashboard" onClick={light} className={item}>
          <span className="bottom-nav-icon"><LayoutDashboard size={21} /></span>
          <span className="bottom-nav-label">Today</span>
        </NavLink>
        <NavLink to="/transactions" end onClick={light} className={item}>
          <span className="bottom-nav-icon"><ListOrdered size={21} /></span>
          <span className="bottom-nav-label">Sales</span>
        </NavLink>
        <NavLink to="/transactions/new" onClick={haptic(ImpactStyle.Medium)}
          className={({ isActive }) => `bottom-nav-sale${isActive ? ' active' : ''}`}>
          <Plus size={22} strokeWidth={2.4} />
          New sale
        </NavLink>
        <NavLink to="/expenses" end onClick={light} className={item}>
          <span className="bottom-nav-icon"><Wallet size={21} /></span>
          <span className="bottom-nav-label">Expenses</span>
        </NavLink>
        {isAdmin ? (
          <NavLink to="/banks" onClick={light} className={item}>
            <span className="bottom-nav-icon"><Landmark size={21} /></span>
            <span className="bottom-nav-label">Banks</span>
          </NavLink>
        ) : (
          <NavLink to="/profile" onClick={light} className={item}>
            <span className="bottom-nav-icon"><UserRound size={21} /></span>
            <span className="bottom-nav-label">Profile</span>
          </NavLink>
        )}
      </div>
    </nav>
  );
}
