// Server-side helpers for the admin Next.js app to call the Darshya API.
//
// Auth: the admin Next.js app is gated by middleware.ts (darshya_admin_session
// cookie comparing to ADMIN_DASHBOARD_TOKEN). Once a request reaches a route
// handler we trust the caller, but the API still requires its own admin token.
//
// We pass the bearer token via Authorization header. In production set
// ADMIN_API_BEARER (or any of the fallbacks below) to a real ADMIN-roled
// session token. In dev with ALLOW_DEMO_TOKENS unset, the API accepts
// "demo-admin" — that's the dev fallback.

export function adminApiBase(): string {
  return (
    process.env.ADMIN_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.API_BASE_URL ??
    'http://localhost:4000'
  );
}

export function adminApiBearer(): string {
  return (
    process.env.ADMIN_API_BEARER ??
    process.env.ADMIN_API_TOKEN ??
    'demo-admin'
  );
}

export function adminApiHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${adminApiBearer()}`,
    ...(extra ?? {}),
  };
}
