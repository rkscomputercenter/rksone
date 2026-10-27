import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BootLoading } from '../components/ui/Loading';
import type { Role } from '../types';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
  /** A custom role passes when it may at least view this module (the server enforces the same rule). */
  permissionKey?: string;
}

export default function ProtectedRoute({ allowedRoles, permissionKey }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role, hasPermission } = useAuth();

  if (isLoading) return <BootLoading />;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    if (role === 'CUSTOM' && permissionKey && hasPermission(permissionKey)) return <Outlet />;
    return <Navigate to="/restricted" replace />;
  }

  return <Outlet />;
}
