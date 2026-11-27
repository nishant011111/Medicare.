import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, usePermissions, useRole } from '../context/AuthContext';
import { RoleCodeType } from '../types/auth';
import { OfficialLogoLoader } from '../components/ui/FeedbackAndData';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: RoleCodeType[];
  requiredPermission?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requiredPermission,
}) => {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const { hasRole } = useRole();
  const { hasPermission } = usePermissions();

  if (loading) {
    return <OfficialLogoLoader message="Verifying MediCore session & RBAC permissions..." />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasRole(...allowedRoles)) {
    return (
      <Navigate
        to="/unauthorized"
        replace
        state={{
          attemptedPath: location.pathname,
          requiredRoles: allowedRoles,
        }}
      />
    );
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <Navigate
        to="/unauthorized"
        replace
        state={{
          attemptedPath: location.pathname,
          requiredPermission,
        }}
      />
    );
  }

  return <>{children}</>;
};
