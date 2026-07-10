// P0 #B3/ag-02 (2026-07-09): server-side portal gate.
//
// Before this middleware, every portal layout (/admin, /priest, /store-admin,
// /astrologer-portal, /wellness-portal, /gaushala-portal) gated access purely
// client-side — the page shell rendered for logged-out users, leaking nav,
// menu structure, and (for some layouts) skeleton data before the client
// redirect fired. This middleware runs on the edge before the page renders:
// it reads the poojly_user cookie (URL-encoded JSON with a `role` field) and
// 307-redirects anyone without the right role to /auth/sign-in.
//
// The cookie is client-set (auth-context setCookie) and is NOT a security
// boundary on its own — the API still enforces role auth on every call. This
// middleware is defence-in-depth + UX: it stops the shell from rendering for
// the wrong audience and avoids a flash of gated chrome. The API remains the
// source of truth for authorization.

import { NextResponse, type NextRequest } from 'next/server';

type RolePathRule = {
  prefix: string;
  roles: string[]; // allowed roles (lower-case UserRole values)
};

// Portal -> allowed roles. Mirrors auth-context UserRole + getRoleDashboardPath.
const RULES: RolePathRule[] = [
  { prefix: '/admin', roles: ['admin'] },
  { prefix: '/priest', roles: ['priest'] },
  { prefix: '/store-admin', roles: ['store_owner'] },
  { prefix: '/astrologer-portal', roles: ['astrologer'] },
  { prefix: '/wellness-portal', roles: ['wellness_instructor'] },
  { prefix: '/gaushala-portal', roles: ['gaushala_manager'] },
];

function roleFromCookie(req: NextRequest): string | null {
  const raw = req.cookies.get('poojly_user')?.value;
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded) as { role?: string };
    const role = parsed?.role;
    return role ? String(role).toLowerCase() : null;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const rule = RULES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + '/'));
  if (!rule) return NextResponse.next();

  const role = roleFromCookie(req);
  const ok = role !== null && rule.roles.includes(role);
  if (ok) return NextResponse.next();

  // Redirect to login, preserving the intended destination for post-login
  // bounce-back. Logged-out + wrong-role both land here.
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
