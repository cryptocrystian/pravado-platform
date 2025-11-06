// =====================================================
// DEFAULT LANDING ROUTER
// Sprint 39 Phase 3.3.1: Role-Aware Defaults System
// =====================================================

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDefaultRoute, useUserRole } from '@/hooks/useRoleBasedNavigation';
import { Loader2 } from 'lucide-react';

/**
 * Component that redirects users to their role-appropriate default dashboard
 * Used on login success or when accessing root /dashboard route
 */
export function DefaultLandingRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  const defaultRoute = useDefaultRoute();
  const { data: userContext, isLoading, error } = useUserRole();

  useEffect(() => {
    // Wait for user role to load
    if (isLoading) return;

    // Handle error - redirect to login
    if (error) {
      navigate('/login', { replace: true });
      return;
    }

    // If we have a default route, redirect there
    if (defaultRoute && defaultRoute !== location.pathname) {
      navigate(defaultRoute, { replace: true });
    }
  }, [defaultRoute, isLoading, error, navigate, location.pathname]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2">Authentication Error</h2>
          <p className="text-muted-foreground mb-4">
            Unable to load your user information. Please try logging in again.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Show welcome message while redirecting
  if (userContext) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">👋</div>
          <h2 className="text-2xl font-bold mb-2">Welcome back!</h2>
          <p className="text-muted-foreground">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Higher-order component to protect routes based on user role
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: import('@pravado/types').UserRole[];
  requiredPermission?: keyof import('@pravado/types').RolePermissions;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  requiredRoles,
  requiredPermission,
  fallback,
}: ProtectedRouteProps) {
  const navigate = useNavigate();
  const { data: userContext, isLoading } = useUserRole();

  useEffect(() => {
    if (isLoading) return;

    if (!userContext) {
      navigate('/login', { replace: true });
      return;
    }

    // Check role requirement
    if (requiredRoles && !requiredRoles.includes(userContext.role)) {
      navigate('/unauthorized', { replace: true });
      return;
    }

    // Check permission requirement
    if (requiredPermission && !userContext.permissions[requiredPermission]) {
      navigate('/unauthorized', { replace: true });
      return;
    }
  }, [userContext, isLoading, requiredRoles, requiredPermission, navigate]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userContext) {
    return fallback || null;
  }

  // Check role requirement
  if (requiredRoles && !requiredRoles.includes(userContext.role)) {
    return fallback || null;
  }

  // Check permission requirement
  if (requiredPermission && !userContext.permissions[requiredPermission]) {
    return fallback || null;
  }

  return <>{children}</>;
}

/**
 * Component for unauthorized access page
 */
export function UnauthorizedPage() {
  const navigate = useNavigate();
  const defaultRoute = useDefaultRoute();

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🚫</div>
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-4">
          You don't have permission to access this page. Please contact your administrator if
          you believe this is an error.
        </p>
        <button
          onClick={() => navigate(defaultRoute)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
