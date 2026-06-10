# CTO Advisory — 2026-W24

> Auto-generated weekly. Decision Agent reads this. Founder override OK.

## Owned items snapshot
- Total: 63
- Planned: 62
- In progress: 1
- Shipped: 0
- Verified: 0
- Blocked: 0

## Top 5 ready-to-ship (revenue/hour desc)
- **R-Q4-E-011** Festival pre-sale calendar — Diwali/Navratri/Karwa-Chauth bookings 60d in advance — ₹15,00,000 / 28h (P1)
- **R-Q4-E-010** Wedding planner v1 end-to-end — muhurat + pandit + venue + catering + photographer — ₹9,00,000 / 40h (P1)
- **R-Q3-E-007** B2B Temple SaaS API v1 — REST endpoints + API keys + rate limits + docs — ₹5,00,000 / 48h (P0)
- **R-Q2-E-001** AI Pandit MVP — Groq LLM proxy + Sanskrit/Hindi knowledge base ingest — ₹2,00,000 / 40h (P0)
- **R-Q3-E-009** Affiliate tracking system — UTM links + referral codes + payout reports — ₹1,00,000 / 24h (P1)

## Founder-blocked
- R-Q1-E-002 blocked by U1: Razorpay raw-body HMAC flip after test-mode validation
- R-Q1-E-008 blocked by U8: 5 funnel events instrumentation via PostHog
- R-Q1-E-011 blocked by U5: Wire FCM server key (env-or-noop already in place)
- R-Q1-E-012 blocked by U2: Embedded Stripe Elements full Provider (E9 carry)
- R-Q2-E-004 blocked by U3: Mobile parity audit — Expo 50 booking flow + Razorpay native checkout
- R-Q2-E-009 blocked by U5: Push notifications backend — FCM topics + per-user delivery preferences
- R-Q2-E-012 blocked by U14: Background job queue — BullMQ + Upstash for email/wa/payout async
- R-Q2-E-015 blocked by U6: Sentry source maps upload + release tracking — both web + api
- R-Q2-IT-001 blocked by U6: Sentry quota tuning — sampling + filters to stay under free tier 5K events/mo
- R-Q3-E-002 blocked by U1: iOS production release — App Store submission + TestFlight 500 users
- R-Q3-E-003 blocked by U1: Android Play Store production release — public listing + 1K installs
- R-Q4-E-003 blocked by U2: Render upgrade to Standard tier — multi-instance horizontal scale for 200K MAU

## Live KPIs (this role)
- manual:razorpay_verify_raw_enabled: undefined (STALE)
- gh_repo:pages_with_csp_nonce: undefined (STALE)

## Dept doctrine (top 30 lines of 01-cto.md)
```
# CTO audit — Darshya

> Author: CTO. Date: 2026-04-27. Honest engineering snapshot for the founder.
> No fabrication. Every claim cites file:line; gaps are marked `[UNKNOWN]`.

---

## 1. System architecture (verified)

Single Turborepo monorepo (`pnpm-workspace.yaml`, `turbo.json`). The web
front end (`apps/web`, Next.js 15 / React 19) is deployed to Cloudflare
Pages and serves `darshya.online`. The API (`apps/api`, Fastify 5) is
deployed to Render free tier at `api.darshya.online`; it boots through `apps/api/src/server.ts:55`,
registering 31 route groups under `/api/v1/*`, with helmet (CSP off,
`server.ts:57-60`), CORS allowlist from `CORS_ORIGIN` (`server.ts:61-70`),
global rate-limit 100/min (`server.ts:71-74`), and per-route `rawBody`
opt-in (`server.ts:80-85`). Postgres + pgvector are on Supabase (pooler,
port 6543); Prisma is the only ORM (`prisma/schema.prisma:1-8`).
Object storage swapped from Cloudflare R2 to Supabase Storage but the
adapter is still named `lib/r2.ts` (`docs/launch-state.md:84`). AI is
Groq (Llama 3.3 70B); embeddings are Cohere; daily cron runs from
GitHub Actions because Render free has no scheduler. Two declared
"apps" are not real: `apps/admin` is an empty shell whose build script
literally echoes `"build: ok (empty shell)"`
(`apps/admin/package.json:9`), and `apps/mobile` is mock-only per
`CLAUDE.md:19`.

## 2. Launch blockers

| Tier | Issue | File:line | Why it embarrasses us |
```

## Recommended next-cycle prompts for Decision Agent
1. Spawn cto-agent on R-Q4-E-011 (Festival pre-sale calendar — Diwali/Navratri/Karwa-Chauth bookings 60d in advance) — festival_pre_sale_bookings 0/5000 count
1. Spawn cto-agent on R-Q4-E-010 (Wedding planner v1 end-to-end — muhurat + pandit + venue + catering + photographer) — wedding_planner_bookings 0/30 count
1. Spawn cto-agent on R-Q3-E-007 (B2B Temple SaaS API v1 — REST endpoints + API keys + rate limits + docs) — b2b_api_endpoints_live 0/15 count
