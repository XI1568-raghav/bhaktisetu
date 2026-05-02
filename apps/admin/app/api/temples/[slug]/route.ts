import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminApiBase, adminApiHeaders } from "../../../../lib/api";

// Server-side proxy so the client component can read & write timings without
// exposing ADMIN_API_BEARER to the browser. The middleware.ts at the app root
// already gates access via the darshya_admin_session cookie.

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { slug } = await ctx.params;
  const res = await fetch(
    `${adminApiBase()}/api/v1/admin/temple-timings/${encodeURIComponent(slug)}`,
    { headers: adminApiHeaders(), cache: "no-store" }
  );
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { slug } = await ctx.params;
  const body = await req.text();
  const res = await fetch(
    `${adminApiBase()}/api/v1/admin/temple-timings/${encodeURIComponent(slug)}`,
    { method: "PATCH", headers: adminApiHeaders(), body }
  );
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}
