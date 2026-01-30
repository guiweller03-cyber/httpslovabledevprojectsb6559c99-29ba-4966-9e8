import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { Loader2 } from 'lucide-react';
import { TenantSetup } from './TenantSetup';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireTenantAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false, requireTenantAdmin = false }: ProtectedRouteProps) {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { userProfile, hasProfile, isTenantAdmin, isLoading: tenantLoading } = useTenant();

  const isLoading = authLoading || tenantLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check for system admin (Control Room)
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Check for tenant admin
  if (requireTenantAdmin && !isTenantAdmin) {
    return <Navigate to="/" replace />;
  }

  // If user has no tenant profile, show setup screen
  if (!hasProfile && !requireAdmin) {
    return <TenantSetup />;
  }

  return <>{children}</>;
}
