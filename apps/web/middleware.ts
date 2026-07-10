// Server-side portal session gate (audit remediation P1-16, 2026-07-10).
//
// SECURITY MODEL: this middleware checks ONLY "session exists" — it verifies
// the `poojly_user` cookie is present and non-empty. It deliberately does NOT
// trust the `role` field inside that cookie. The cookie is client-set
// (auth-context setCookie: lib/auth-context.tsx:264-266) as plain,
// unsigned, non-HttpOnly JSON, so its `role` value is user-spoofable.
// Gating on it here would let an attacker set `role:'admin'` in their cookie
// and bypass the shell flash — reducing real protection to nothing.
//
// Role enforcement is API-side: every portal API call is authenticated by the
// server against the real session/JWT, and the client AuthGuard
// (AuthGuard in lib/auth-context) renders the correct portal shell only after
// the server confirms the role. This middleware is defence-in-depth + UX only:
// it stops the page shell from rendering for a fully logged-out user (no
// cookie at all) and avoids a flash of gated chrome before the client redirect
// can fire. A user with ANY cookie passes this gate; the API + AuthGuard are
// the real authorization boundary.

import { NextResponse, type NextRequest } from 'next/server';

// Portal path prefixes that require a logged-in session to render.
// NOTE: these are no longer role-gated — see comment above.
const PORTAL_PREFIXES = [
  '/admin',
  '/priest',
  '/store-admin',
  '/astrologer-portal',
  '/wellness-portal',
  '/gaushala-portal',
];

// A session exists iff the poojly_user cookie is present and non-empty.
// We intentionally do NOT parse or trust the `role` field inside it.
function hasSession(req: NextRequest): boolean {
  const raw = req.cookies.get('poojly_user')?.value;
  return !!raw && raw.trim().length > 0;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPortal = PORTAL_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
  if (!isPortal) return NextResponse.next();

  if (hasSession(req)) return NextResponse.next();

  // No session cookie at all → redirect to login, preserving the intended
  // destination for post-login bounce-back.
  const signIn = new URL('/auth/login', req.url);
  signIn.searchParams.set('redirect', pathname);
  return NextResponse.redirect(signIn, 307);
}

export const config = {
  // Only run the gate on portal paths — leaves public + auth routes untouched.
  matcher: [
    '/admin/:path*',
    '/priest/:path*',
    '/store-admin/:path*',
    '/astrologer-portal/:path*',
    '/wellness-portal/:path*',
    '/gaushala-portal/:path*',
  ],
};
