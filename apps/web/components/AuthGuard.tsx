'use client';

import { useEffect } from 'react';
import { useAuth, getRoleDashboardPath, type UserRole } from '../lib/auth-context';
import { isSuspendedRedirectPending } from '../lib/suspended-notice';
import { useSoftNavigate } from '../lib/use-soft-navigate';

interface AuthGuardProps {
 children: React.ReactNode;
 fallback?: React.ReactNode;
 /** If provided, only users with one of these roles can access the page.
 * Users with a different role are redirected to their own correct portal. */
 allowedRoles?: UserRole[];
}

const Spinner = () => (
 <div className="min-h-[100dvh] flex items-center justify-center bg-saffron-50">
 <div className="text-center">
 <div className="w-12 h-12 border-4 border-saffron-200 border-t-saffron-600 rounded-full animate-spin mx-auto mb-4" />
 <p className="text-surface-500 text-sm">Loading...</p>
 </div>
 </div>
);

/**
 * AuthGuard wraps protected pages.
 * - Redirects unauthenticated users to /auth/login
 * - When allowedRoles is provided, redirects wrong-role users to their correct portal
 */
export default function AuthGuard({ children, fallback, allowedRoles }: AuthGuardProps) {
 const { isAuthenticated, isLoading, user } = useAuth();
 const navigate = useSoftNavigate();

 useEffect(() => {
 if (isLoading) return;

 // Not logged in → send to login with return URL
 if (!isAuthenticated) {
 if (isSuspendedRedirectPending()) return;
 const currentPath = window.location.pathname;
 window.location.href = `/auth/login?redirect=${encodeURIComponent(currentPath)}`;
 return;
 }

 // Wrong role → redirect to their correct dashboard
 if (user && allowedRoles && !allowedRoles.includes(user.role)) {
 // Soft: a full load would drop the in-memory access token.
 navigate(getRoleDashboardPath(user.role));
 }
 }, [isLoading, isAuthenticated, user, allowedRoles, navigate]);

 if (isLoading) {
 return <>{fallback ?? <Spinner />}</>;
 }

 if (!isAuthenticated) {
 return <Spinner />;
 }

 // Wrong role — show spinner while redirect happens
 if (user && allowedRoles && !allowedRoles.includes(user.role)) {
 return (
 <div className="min-h-[100dvh] flex items-center justify-center bg-saffron-50">
 <div className="text-center">
 <div className="w-12 h-12 border-4 border-saffron-200 border-t-saffron-600 rounded-full animate-spin mx-auto mb-4" />
 <p className="text-surface-500 text-sm">Redirecting to your portal...</p>
 </div>
 </div>
 );
 }

 return <>{children}</>;
}
