// Server-side helpers for the admin Next.js app to call the Darshya API.
//
// Auth: the admin Next.js app is gated by middleware.ts (darshya_admin_session
// cookie comparing to ADMIN_DASHBOARD_TOKEN). Once a request reaches a route
// handler we trust the caller, but the API still requires its own admin token.
//
// We pass the bearer token via Authorization header. ADMIN_API_BEARER (or
// ADMIN_API_TOKEN) MUST be set in any deployed environment — there is no
// silent demo fallback. In local dev, set ADMIN_API_BEARER=demo-admin in
// apps/admin/.env.local along with ALLOW_DEMO_TOKENS=true on the API.

export function adminApiBase(): string {
  const base =
    process.env.ADMIN_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.API_BASE_URL;
  if (!base) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'admin/lib/api: ADMIN_API_BASE_URL (or NEXT_PUBLIC_API_URL / API_BASE_URL) is required in production.'
      );
    }
    return 'http://localhost:4000';
  }
  return base;
}

export function adminApiBearer(): string {
  const bearer = process.env.ADMIN_API_BEARER ?? process.env.ADMIN_API_TOKEN;
  if (!bearer) {
    throw new Error(
      'admin/lib/api: ADMIN_API_BEARER (or ADMIN_API_TOKEN) is required. ' +
        'No silent demo-admin fallback — set it in env (local dev: demo-admin + API ALLOW_DEMO_TOKENS=true).'
    );
  }
  return bearer;
}

export function adminApiHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${adminApiBearer()}`,
    ...(extra ?? {}),
  };
}
