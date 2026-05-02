import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminApiBase, adminApiHeaders } from "../../../lib/api";

// Server-side proxy for the content draft queue.
// Middleware.ts at the app root gates access via the darshya_admin_session
// cookie; the bearer for the API is injected here so it never reaches the
// browser.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") ?? "";
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await fetch(`${adminApiBase()}/api/v1/admin/content-queue/${qs}`, {
    headers: adminApiHeaders(),
    cache: "no-store",
  });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}
