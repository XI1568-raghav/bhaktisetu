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

  // AUTH-09 (2026-08-20): SAY WHAT THIS ACTUALLY DOES.
  //
  // POST /auth/logout is global — supabase.auth.signOut() defaults to global
  // scope and the handler burns every refresh_token_jtis row the account holds,
  // so this ends the session on the user's phone as well as on the machine they
  // are standing at. That is the right default on a shared or lost device, but
  // a user who signs out of a library computer and finds their phone logged out
  // has been surprised by their own security tool. The API names the scope it
  // applied; this is the screen that has to put it in words.
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex items-center">
        <Loader2 className="h-6 w-6 animate-spin text-saffron-500" />
        <span className="ml-3 text-surface-500">Signing you out…</span>
      </div>
      <p className="prose-meta text-surface-400 mt-3 max-w-xs">
        For your security this signs you out on all your devices, not just this one.
      </p>
    </div>
  );
}
