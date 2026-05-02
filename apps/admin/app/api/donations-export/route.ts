import { NextResponse } from "next/server";
import { adminApiBase, adminApiHeaders } from "../../../lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);

  const upstream = `${adminApiBase()}/api/v1/admin/donations/export.csv${qs.toString() ? `?${qs.toString()}` : ""}`;
  const res = await fetch(upstream, {
    headers: adminApiHeaders(),
    cache: "no-store",
  });

  const body = await res.arrayBuffer();
  const headers = new Headers();
  headers.set(
    "content-type",
    res.headers.get("content-type") ?? "text/csv; charset=utf-8",
  );
  const dispo = res.headers.get("content-disposition");
  if (dispo) headers.set("content-disposition", dispo);
  headers.set("cache-control", "no-store");
  return new NextResponse(body, { status: res.status, headers });
}
