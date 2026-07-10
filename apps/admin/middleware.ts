import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "darshya_admin_session";

// P0 #B4 (2026-07-09): constant-time string compare for the shared admin
// token. The old `===` comparison short-circuits on the first byte, leaking
// token length/prefix via response timing. This is a defence-in-depth
// hardening of the existing shared-token model; the fuller fix (per-user
// Supabase JWT + requireRole('admin'), deprecating the shared token) is a
// larger auth migration tracked as a follow-up — see docs/ for the deferral
// note. Until then the shared token remains env-gated + fail-closed.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still walk both strings to keep the work roughly constant on length
    // mismatch — compare b against itself so the loop count doesn't leak.
    let acc = 1;
    for (let i = 0; i < b.length; i++) acc |= b.charCodeAt(i) ^ b.charCodeAt(i);
    return acc === 0 && a.length === b.length;
  }
  let acc = 0;
  for (let i = 0; i < a.length; i++) acc |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return acc === 0;
}

export function middleware(request: NextRequest) {
  const expected = process.env.ADMIN_DASHBOARD_TOKEN;

  if (!expected) {
    // Fail CLOSED — never serve admin world-readable just because the env is missing.
    // Prior behavior (NextResponse.next()) exposed all 14 admin pages on any misconfig.
    return new NextResponse(
      "Admin disabled: ADMIN_DASHBOARD_TOKEN not configured on this deployment.",
      {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8" },
      }
    );
  }

  const presented = request.cookies.get(COOKIE_NAME)?.value ?? "";
  if (presented && timingSafeEqual(presented, expected)) {
    return NextResponse.next();
  }

  return new NextResponse(
    "Unauthorized. Set the darshya_admin_session cookie to ADMIN_DASHBOARD_TOKEN to access this dashboard.",
    {
      status: 401,
      headers: { "content-type": "text/plain; charset=utf-8" },
    }
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
