import { NextResponse } from "next/server";
import { adminApiBase, adminApiHeaders } from "../../../../lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const res = await fetch(`${adminApiBase()}/api/v1/admin/bookings/refunds/pending`, {
    headers: adminApiHeaders(),
    cache: "no-store",
  });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}
