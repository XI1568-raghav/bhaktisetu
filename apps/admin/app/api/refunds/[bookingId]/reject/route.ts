import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminApiBase, adminApiHeaders } from "../../../../../lib/api";

interface RouteContext {
  params: Promise<{ bookingId: string }>;
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { bookingId } = await ctx.params;
  const body = await req.text();
  const res = await fetch(
    `${adminApiBase()}/api/v1/admin/bookings/refunds/${encodeURIComponent(bookingId)}/reject`,
    { method: "POST", headers: adminApiHeaders(), body: body || "{}" }
  );
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}
