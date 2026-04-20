'use client';

import { useEffect } from 'react';
import { useAuth } from '../lib/auth-context';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * AuthGuard wraps protected pages.
 * Redirects to /auth/login if the user is not authenticated.
 * Shows a loading spinner while checking auth state.
 */
export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const currentPath = window.location.pathname;
      window.location.href = `/auth/login?redirect=${encodeURIComponent(currentPath)}`;
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-saffron-50">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-saffron-200 border-t-saffron-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-surface-500 text-sm">Loading...</p>
          </div>
        </div>
      )
    );
  }

  if (!isAuthenticated) {
    // Will redirect via useEffect — show loading in the meantime
    return (
      <div className="min-h-screen flex items-center justify-center bg-saffron-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-saffron-200 border-t-saffron-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-surface-500 text-sm">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
