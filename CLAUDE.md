# Poojly — Project Context

## Overview
Poojly is India's devotional super-app — an integrated platform for live darshan, puja booking with video proof, spiritual content, e-commerce, and gaushala seva. Target market: $58.56B Indian religious market growing at 28-35% CAGR in digital.

## Tech Stack
- **Monorepo**: Turborepo + pnpm workspaces
- **Web**: Next.js 15 + React 19 + TypeScript + Tailwind CSS v4 + ShadcnUI
- **API**: Fastify 5 + Prisma ORM + PostgreSQL (Supabase)
- **Mobile**: React Native (Expo) with Expo Router
- **E-commerce**: MedusaJS (headless)
- **Payments**: Razorpay (domestic) + Stripe (NRI/international)
- **Streaming**: AWS IVS for live darshan
- **Cache**: Upstash Redis
- **AI**: Claude API for recommendations and spiritual Q&A
- **CMS**: Sanity for editorial content
- **Deployment**: Vercel (web) + Railway (API) + Cloudflare (CDN)

## Repository Structure
```
apps/web        → Next.js 15 main website (port 3000)
apps/api        → Fastify backend API (port 4000)
apps/admin      → Admin dashboard (port 3001)
apps/mobile     → React Native Expo app
apps/medusa-store → MedusaJS commerce engine
packages/ui     → Shared component library (ShadcnUI-based)
packages/shared → TypeScript types, Zod validators, constants, utils
packages/api-client → React Query hooks + typed fetch client
packages/analytics → PostHog event tracking
```

## Domain Concepts
- **Darshan**: Live video stream from a temple's sanctum sanctorum
- **Puja**: A ritual prayer performed by a priest on behalf of a devotee
- **Sankalp**: A formal prayer intention with devotee's name and gotra
- **Prasad**: Sacred food offering from the temple, delivered to the devotee
- **Panchang**: Hindu almanac with tithi, nakshatra, yoga, karana, festivals
- **Gotra**: Family lineage identifier used in Hindu rituals
- **Nakshatra**: Birth star constellation, important for puja recommendations
- **Rashi**: Zodiac sign in Vedic astrology
- **Chadhava**: Virtual offering at a temple (flowers, bhog, diya)
- **Gaushala**: Cow shelter — cow feeding and adoption services

## Coding Conventions
- TypeScript strict mode everywhere
- Zod for ALL external input validation (API requests, form data)
- Prisma for database queries — never raw SQL unless performance-critical
- React Query (TanStack Query) for all API calls in frontend
- ShadcnUI components as base — customize via CVA variants
- File naming: kebab-case for files, PascalCase for components
- API routes follow REST conventions with /api/v1/ prefix
- All prices stored as Decimal(10,2) in database, formatted via formatPrice util
- Booking numbers: BS-YYYYMMDD-XXXXX format
- Always support both INR and USD pricing (NRI users)

## Testing
- Vitest for unit tests
- Playwright for E2E tests
- Test files co-located: `*.test.ts` next to source
- Run tests: `pnpm turbo test`
- Target: 90%+ coverage on services, 100% on validators

## Key Business Rules
1. Video proof is MANDATORY for all puja bookings — priest must upload before payout
2. NRI users pay 9-10x domestic prices (configured per puja type)
3. Platform commission: 20-40% on puja bookings (configured per temple)
4. Priest payout = booking price - platform commission
5. Booking cancellation allowed up to 24 hours before scheduled time
6. All temples must be verified before going live
7. Priests require Aadhaar verification for payouts

## Development Methodology
Using Superpowers framework: Brainstorm → Plan → TDD → Execute → Review → Verify
- Always write tests before implementation (RED-GREEN-REFACTOR)
- Break features into 2-5 minute micro-tasks
- Use git worktrees for feature isolation
- Two-stage code review: spec compliance, then code quality
