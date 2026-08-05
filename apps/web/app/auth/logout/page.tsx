'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import { Loader2 } from 'lucide-react';

// P1 #212 (2026-08-03): `/auth/logout` was a 404 — at least one "Sign Out"
// affordance navigated here and left the user logged in. Make it a real route
// that runs the client signOut (clears session + cookies + server token) and
// then lands on the home page.
export default function LogoutPage() {
  const { signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await signOut();
      } finally {
        if (!cancelled) router.replace('/');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signOut, router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-saffron-500" />
      <span className="ml-3 text-surface-500">Signing you out…</span>
    </div>
  );
}
