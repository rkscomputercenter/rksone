import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
  permissionKey?: string;
}

export default function ProtectedRoute({ allowedRoles, permissionKey }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role, user } = useAuth();

  if (isLoading) {
    return (
      <div className="page-loading">
        <div className="spinner spinner-lg" />
        <span>Loading...</span>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    if (role === 'CUSTOM' && permissionKey) {
      const perms = user?.customPermissions?.[permissionKey];
      if (perms?.read) {
        return <Outlet />;
      }
    }
    return <Navigate to="/restricted" replace />;
  }

  return <Outlet />;
}
