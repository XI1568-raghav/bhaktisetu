# B2B White-label v1 — Engineering Build Spec

> **Roadmap item**: R-Q4-E-009 (P0) · **Authored**: 2026-06-13 · **Implements**: docs/specs/b2b-whitelabel-v1.md (R-Q4-P-006 product spec)

## Goal

Engineering implementation of B2B white-label v1: temple chain gets custom domain (e.g. iskcon-india.bhaktisetu.com) + Razorpay sub-merchant routing + isolated branding.

## Architecture

### Custom domain handling

- Tenant requests subdomain at admin onboarding
- Cloudflare DNS API auto-creates CNAME to `*.bhaktisetu.com`
- Next.js middleware intercepts host header → maps to `tenant_id` → loads tenant config

```typescript
// apps/web/middleware.ts
export function middleware(req) {
  const host = req.headers.get('host');
  const tenantSubdomain = extractTenantSubdomain(host); // e.g. "iskcon-india"
  const tenant = await getTenantBySlug(tenantSubdomain);
  if (tenant) {
    req.nextUrl.searchParams.set('tenant', tenant.id);
    // Set tenant theme via cookie OR header for downstream rendering
  }
  return NextResponse.next();
}
```

**EDGE-RUNTIME ALERT**: middleware.ts triggers `runtime='edge'` sweep across all ~300 routes. Pre-plan migration ticket R-Q4-E-009-pre.

### Tenant theming

Server component reads `tenant_id` → fetches theme JSON:

```json
{
  "primary_color": "#FF6B35",
  "secondary_color": "#1A237E",
  "logo_url": "https://cdn.bhaktisetu.com/tenants/iskcon-india/logo.png",
  "font_family": "Iskcon-display",
  "custom_css": "...",
  "footer_html": "Powered by ISKCON Foundation, in partnership with Bhaktisetu"
}
```

Tailwind w/ CSS variables for theming.

### Razorpay sub-merchant routing

Each tenant has Razorpay sub-merchant ID. Payments auto-split:
- 80% to tenant's bank account
- 15% to Bhaktisetu Foundation
- 5% to Razorpay fees

Via Razorpay Route API (cross-ref R-Q4-E-007 escrow spec).

### Data isolation

- Bookings have `tenant_id` foreign key (extends existing schema per P-006)
- Tenant-scoped query helpers in service layer: `getBookingsForTenant(tenantId)`
- Admin tools cross-tenant only via founder-level access

## Tickets

- R-Q4-E-009-pre: edge-runtime sweep migration for middleware addition
- R-Q4-E-009a: Tenant Prisma model + B2bTenant onboarding API
- R-Q4-E-009b: Cloudflare DNS API integration for auto-CNAME
- R-Q4-E-009c: Next.js middleware for tenant resolution
- R-Q4-E-009d: Tenant theming system
- R-Q4-E-009e: Razorpay sub-merchant routing
- R-Q4-E-009f: Tenant-scoped service layer
- R-Q4-E-009g: Admin tenant management UI

## Risk

EDGE-RUNTIME sweep is biggest blocker. Plan + ship sweep first (R-Q4-E-009-pre) — likely 2-3 days work for ~300 routes review + adjustment.

## Closes

R-Q4-E-009 — engineering spec shipped.
