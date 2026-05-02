import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminApiBase, adminApiHeaders } from "../../../../lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.search ?? "";
  const res = await fetch(`${adminApiBase()}/api/v1/admin/whatsapp/deliveries${qs}`, {
    headers: adminApiHeaders(),
    cache: "no-store",
  });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}
