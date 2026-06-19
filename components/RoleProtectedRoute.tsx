// components/RoleProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { RoleName } from '../utils/rbac';

type Props = {
  allowedRoles: RoleName[];
  /** مسیر ریدایرکت هنگام عدم دسترسی */
  redirectTo?: string;
};

const RoleProtectedRoute: React.FC<Props> = ({ allowedRoles, redirectTo = '/403' }) => {
  const { currentUser, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        <i className="fas fa-spinner fa-spin text-3xl" />
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(currentUser.roleName as RoleName)) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};

export default RoleProtectedRoute;
