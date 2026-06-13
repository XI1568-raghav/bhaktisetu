# Multi-Tenant Temple Admin Panel — Subdomain Routing + Custom Branding

> **Roadmap item**: R-Q3-E-010 (P1) · **Authored**: 2026-06-13

## Goal

Q3 ship multi-tenant temple admin. Subdomain routing (e.g., kashi.bhaktisetu.com) + custom branding (logo + color + footer). Enables white-label per R-Q2-S-004 B2B path.

## Architecture

```
*.bhaktisetu.com → CF Worker → resolveTenant(subdomain) → Next.js w/ tenant context
```

CF Worker reads subdomain → calls /api/v1/tenants/:subdomain → if exists, attach tenant_id to request → Next.js page renders w/ tenant branding.

## Schema

```prisma
model TempleTenant {
  id              String   @id @default(cuid())
  subdomain       String   @unique
  templeName      String   @map("temple_name")
  logoUrl         String?  @map("logo_url")
  brandColor      String   @default("#9e6229") @map("brand_color")
  footerHtml      String?  @map("footer_html") @db.Text
  status          TenantStatus @default(active)
  pandits         Pandit[]
  pujas           Puja[]
  createdAt       DateTime @default(now())
  @@map("temple_tenants")
}

enum TenantStatus { active suspended terminated }
```

## Subdomain examples

- `kashi.bhaktisetu.com` → Kashi Vishwanath branded
- `iskcon-juhu.bhaktisetu.com` → ISKCON Juhu branded
- `tirupati.bhaktisetu.com` → Tirupati Devasthanam branded

## CF Wildcard SSL

CF Pages w/ wildcard `*.bhaktisetu.com` cert via CF Pages settings.

## Engineering tickets

- R-Q3-E-010a: Prisma migration
- R-Q3-E-010b: CF Worker subdomain resolver
- R-Q3-E-010c: Tenant context React provider
- R-Q3-E-010d: Per-tenant branding render
- R-Q3-E-010e: Temple admin onboarding UI

## Closes

R-Q3-E-010 — spec shipped.
