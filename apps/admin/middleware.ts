import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "darshya_admin_session";

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

  const presented = request.cookies.get(COOKIE_NAME)?.value;
  if (presented === expected) {
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
