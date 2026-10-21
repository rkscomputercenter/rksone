import React from 'react';
import { NavLink } from 'react-router-dom';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { FcComboChart, FcLibrary, FcList, FcMoneyTransfer, FcBusinessman } from 'react-icons/fc';
import { useAuth } from '../../context/AuthContext';

export default function BottomNav() {
  const { isAdmin } = useAuth();

  const triggerHaptic = () => {
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    }
  };

  const triggerHeavyHaptic = () => {
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
    }
  };

  return (
    <nav className="bottom-nav hide-desktop">
      <div className="bottom-nav-container">
        {isAdmin && (
          <NavLink to="/analytics" onClick={triggerHaptic} className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
            <span className="bottom-nav-icon"><FcComboChart size={24} /></span>
            <span className="bottom-nav-label">Analytics</span>
          </NavLink>
        )}
        
        {isAdmin && (
          <NavLink to="/banks" onClick={triggerHaptic} className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
            <span className="bottom-nav-icon"><FcLibrary size={24} /></span>
            <span className="bottom-nav-label">Banks</span>
          </NavLink>
        )}

        {!isAdmin && (
          <NavLink to="/profile" onClick={triggerHaptic} className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
            <span className="bottom-nav-icon"><FcBusinessman size={24} /></span>
            <span className="bottom-nav-label">Profile</span>
          </NavLink>
        )}
        
        <div className="bottom-nav-item center-fab-container">
          <NavLink to="/transactions/new" onClick={triggerHeavyHaptic} className={({ isActive }) => `center-fab ${isActive ? 'active' : ''}`}>
            <span className="fab-icon">＋</span>
          </NavLink>
        </div>
        
        <NavLink to="/transactions" onClick={triggerHaptic} className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <span className="bottom-nav-icon"><FcList size={24} /></span>
          <span className="bottom-nav-label">Records</span>
        </NavLink>
        
        {isAdmin && (
          <NavLink to="/expenses" onClick={triggerHaptic} className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
            <span className="bottom-nav-icon"><FcMoneyTransfer size={24} /></span>
            <span className="bottom-nav-label">Expenses</span>
          </NavLink>
        )}
      </div>
    </nav>
  );
}
