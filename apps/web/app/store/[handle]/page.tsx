import { redirect } from 'next/navigation';


// Canonical product detail lives at /store/view?handle=… (a single 'use client'
// page that resolves the handle against the in-memory PRODUCTS seed catalogue
// in lib/products.ts). The store listing (/store), the cart, and the related-
// products rail all link to the friendly /store/<handle> URL, which previously
// 404'd under @cloudflare/next-on-pages — the public/_redirects rule
// (/store/:handle → /store/view?handle=:handle 302) is a Cloudflare Pages
// static-asset directive that the Next.js worker ignores, so every product
// page returned 404. Mirroring the /astrology/[id] pattern, this edge route
// issues a 307 to the real view page so the friendly URL resolves for users,
// crawlers, and the JSON-LD item URLs in lib/jsonld.ts.
export default async function ProductByHandleRedirect({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  redirect(`/store/view?handle=${encodeURIComponent(handle)}`);
}
