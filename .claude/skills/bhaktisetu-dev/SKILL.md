---
name: Poojly Development
description: Project-specific conventions for the Poojly devotional super-app. Ensures consistent patterns across all features.
---

# Poojly Development Conventions

## Architecture
- Monorepo: Turborepo + pnpm workspaces
- Web: Next.js 15 + React 19 + Tailwind CSS v4
- API: Fastify 5 + Prisma ORM + PostgreSQL (Supabase)
- AI: Claude API (@anthropic-ai/sdk) with prompt caching
- Payments: Razorpay (domestic) + Stripe (NRI)

## File Patterns
- Services: class-based singletons at `apps/api/src/services/`
- Routes: Fastify plugin functions at `apps/api/src/routes/`
- Pages: Next.js App Router at `apps/web/app/`
- Components: `apps/web/components/` — client components with 'use client'
- Tests: co-located `*.test.ts` next to source files

## Code Rules
- TypeScript strict mode everywhere
- Zod for ALL external input validation
- All prices as Decimal(10,2) — never floating point
- Booking numbers: BS-YYYYMMDD-XXXXX format
- All API responses: `{ data, pagination }` or `{ error }`
- Auth middleware: `authenticateUser` preHandler on protected routes
- Demo mode: handle missing DB/API gracefully with fallback data

## Design System
- Primary: Saffron (#E16318) — not generic blue
- Neutrals: Warm surface-* palette — not cold grays
- Cards: rounded-xl (12px), subtle border, hover translateY(-2px)
- Buttons: rounded-lg (8px), font-medium, not gradient
- Sections: alternate bg-surface-50 / bg-white
- No AI slop: no blur circles, no identical section headers, no rounded-2xl everywhere

## Business Rules
- Video proof mandatory for all puja bookings
- Priest payout only after video upload
- Platform commission: 20-40% per temple
- NRI pricing: 9-10x domestic
- 24-hour cancellation window for confirmed bookings
