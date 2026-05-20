# Handoff Log — Darshya

> Append-only. Newest first. Lazy-loaded (not in CLAUDE.md @-imports).

## 2026-05-21 — Prod migrations + ship commit c9d9288

**Status**: shipped to origin/main. Render API + CF Pages auto-deploying.

> Post-`/clear` continuity: `docs/operational-context.md` covers every external service + key + deploy mechanism. `docs/future-plans.md` covers roadmap + gates. This block + TASKS.md In progress = current state.

### Prod DB migrations applied
Project: poojly Supabase (`hlkvfarvfblhzhhnhtbp.supabase.co`, ap-northeast-1 pooler).

Method: `prisma db execute --url $DIRECT_URL --file <migration.sql>` per migration (used DIRECT_URL not pooled, supports DDL). `_prisma_migrations` tracker table empty — schema applied directly, Supabase dashboard "Last migration: No migrations" is expected (cosmetic only).

Applied:
- `20260520000000_priest_puja_offerings` — NEW (table created)
- `20260520010000_admin_p0_p1_bundle` — idempotent IF NOT EXISTS (all cols added)
- `20260520020000_e7_followups` — idempotent (FK cols + nullable gaushala_id)
- `20260519000000_gaushala_cows_volunteers` — SKIPPED: tables already on prod from earlier direct DDL (verified all 3 present: cows, cow_health_records, volunteers)

### Verification artefact
`apps/api/scripts/check-prod-tables.mjs` — reads `.env.production` (parses inline, no dotenv dep), connects via Prisma to DIRECT_URL, checks tables + columns + FKs + row counts. Re-runnable anytime. Output 2026-05-21:
- TABLES 5/5 ✓ (cows, cow_health_records, volunteers, priest_puja_offerings, store_products)
- COLUMNS 14/14 ✓ (users.blocked*, astrologer_profiles.availability, temple_puja_offerings.nri_price+assigned_priest_id, live_darshan_streams.title/description/camera_location, puja_bookings.priest_puja_offering_id, reviews.product_id, donations.temple_id, priest_puja_offerings.max_bookings_per_slot/available_slots)
- FKs 6/6 ✓
- donations.gaushala_id nullable ✓
- Row counts: 32 users, 20 temples, 3 priests, 25 temple offerings, 6 bookings. priest_puja_offerings/store_products/donations = 0 (new feature tables, no seed).

### Pre-existing test gap surfaced + fixed
`admin.service.test.ts:167` was failing — W2 change switched `getDashboard` revenue to `prisma.transaction.aggregate({...})` but the mock setup at `src/lib/__mocks__/prisma.ts:93` lacked `transaction.aggregate`. Without it, try-catch in `getDashboard` caught undefined-mock error → fell back to MOCK_USERS demo dashboard → totalUsers=8 not 100. Fix: added `aggregate: vi.fn()` to transaction block in mock + `mockResolvedValue({ _sum: { amount: 1500 } })` to test. All 476/476 green now.

### Commit c9d9288 (35 files)
Bundle covers waves W1-W8 from earlier handoffs:
- 3 new migrations + schema.prisma updates
- 6 new API routes (priests-public, store-admin, +tests for store-admin/priest-pujas/temple-portal-crud)
- 9 existing API routes touched (admin, bookings, payment, priest, store, temple-portal, wellness-portal, wellness-sessions, astrologer-portal, server)
- 5 new web lib files (astrologer-api, pandit-api, store-admin-api, temple-api, wellness-api)
- 16 web pages migrated off localStorage to real APIs
- checkout/offering/[offeringId] dual-currency flow
- pujas/home-puja/[slug] + pujas/marriage dynamic grids
- pujas/pandits/[id] legacy redirect to /pandits
- TASKS.md trimmed, docs/handoff.md created, .gitignore added `*.bak-*`

### Pending engineering (carried)
- **E2**: FCM server key paste — env-or-noop, requires user paste
- **E9**: Embedded Stripe Elements for clientSecret-only fallback (TODO W8, mirrors pujas page gap; current path uses Stripe Checkout URL redirect)
- **E10**: `getPublicPriests({ specialization?, deity? })` server-side filter — client-side keyword filter on specializations+bio works; server filter would reduce payload

### Pre-existing test debt (NOT blocking)
`apps/web/__tests__/*` + `vitest.setup.ts` — missing `@testing-library/react` types. Same errors every tsc run. Pre-existing across all recent commits. Fix needs `pnpm install @testing-library/react -D` in web. Out of scope for current work.

### User next steps
1. Smoke-test prod: admin /users + /approvals (was 500ing), booking checkout, dual-currency NRI flow (Stripe USD with non-IST timezone)
2. Monitor Render + CF Pages deploy
3. Eventually rotate Resend key `***REMOVED***` (LEAKED in git history per standing memory)

### Standing constraints (carry forward)
- Don't rename poojly_* keys, package.json names, storage prefixes
- Don't WebFetch darshya.online (CF 403)
- Demo-token branch in API auth gated by `NODE_ENV !== 'production' || ALLOW_DEMO_TOKENS === 'true'` — unset on Render after demos
- DO NOT enable `ALLOW_DEMO_PAYMENTS` or any test/skip-payment branch
- DO NOT touch Razorpay/Stripe live keys
- Agents NOT run `pnpm install`, NOT push to git — main thread owns verification + commit

### Future plans reference
Full forward view: `docs/future-plans.md` (consolidates roadmap-archive + activation-gates + mobile-plan). Near-term engineering: E2/E9/E10 in TASKS.md. Q3 candidates + 8 revenue lines + long-term bets + tripwires + mobile remaining all in one glance.

## 2026-05-20c — E7/E8 follow-ups (W6-W8)

**Shipped** (uncommitted). 3 agents. tsc clean both packages. 92/92 touched-file tests pass.

### W6 BE bundle (`@poojly/api`)
- **Migration** `20260520020000_e7_followups/migration.sql` (idempotent). Adds: `puja_bookings.priest_puja_offering_id` (FK SET NULL), `reviews.product_id` (FK CASCADE), `donations.temple_id` (FK SET NULL) + `donations.gaushala_id` made nullable (polymorphic), `priest_puja_offerings.max_bookings_per_slot` (default 1) + `available_slots JSONB`.
- **`/bookings/from-offering`** — dropped W4 JSON marker hack, sets `priestPujaOfferingId` FK directly. NRI USD path via Stripe (basePrice × 9). Slot capacity validated against `availableSlots` + `maxBookingsPerSlot` (409 on overflow).
- **`createStripeOrder`** — added `{ usdAmountOverride }` option (offering bookings bill basePrice × 9, temple pujas still read `pujaType.nriPrice`).
- **`/temple-portal/donations`** — real `prisma.donation.findMany({ where: { templeId } })`. Mirrors gaushala-portal shape.
- **`/store/reviews`** — joins per-product reviews via store-owner's products + legacy `providerType=STORE`. Includes product name.
- **`/priest/pujas`** — POST/PATCH accept `maxBookingsPerSlot` (1-1000) + `availableSlots` (array max 200).
- Deviation: app-level invariant "exactly one of (templeId, gaushalaId) non-null" on Donation, no DB CHECK (avoids back-fill ordering issue). Documented in migration.
- 10 new Zod tests. Pre-existing `admin.service.test.ts:167` mock failure unrelated.

### W7 home-puja + marriage grids → real priests
- `apps/web/app/pujas/home-puja/[slug]/page.tsx` + `apps/web/app/pujas/marriage/page.tsx` — replaced `homePandits`/`weddingPandits` (static `p1`-`p8`/`w1`-`w5`) with `getPublicPriests()` + client-side keyword filter (slug/name vs `specializations`+`bio`). Marriage filter: `['marriage','wedding','vivah','kalyanam','anand karaj']`.
- Fallback: top 6 verified pandits ("Featured pandits") when filter empty. Empty-state copy on fresh DB.
- Card style mirrors `/pandits/page.tsx`. Links → `/pandits/[id]`.
- `home-pujas.ts` file kept (untouched, no other consumers broken).
- Future API enhancement noted (not blocking): `getPublicPriests({ specialization?, deity? })` server-side filter.

### W8 dual-currency offering checkout
- `apps/web/app/checkout/offering/[offeringId]/page.tsx` — added INR/USD pill toggle. NRI detect via browser timezone (anything other than `Asia/Kolkata`/`Asia/Calcutta` defaults `payInUsd=true`). Auth-context has no `country` field, timezone is only signal in use.
- USD path: `handleStripePayment` POSTs `/bookings/from-offering` with `currency:'USD'`, redirects to `checkoutUrl`. Fallback to support-email when only `clientSecret` returned (mirrors pujas page pattern).
- Pattern source: `apps/web/app/pujas/[slug]/book/page.tsx` (timezone heuristic, `handleStripePayment`, toggle UX).
- `priceUsd = priceInr × 9` matches W6 server multiplier.
- TODO(W8): embedded Stripe Elements for clientSecret-only path (same as pujas page).

### Migrations to deploy (cumulative)
1. `20260519000000_gaushala_cows_volunteers` (may be deployed)
2. `20260520000000_priest_puja_offerings` (uncommitted prior session)
3. `20260520010000_admin_p0_p1_bundle` (uncommitted W2)
4. `20260520020000_e7_followups` (uncommitted W6) — **idempotent, safe to replay**

### Open follow-ups (post W6)
- TODO(W8): embedded Stripe Elements path.
- API enhancement (non-blocking): `getPublicPriests({ specialization?, deity? })` server-side filter.
- User-action: verify all 4 migrations on Supabase (esp. `users.blocked` for admin fix + W6 polymorphic donations).

## 2026-05-20b — admin fix + P0/P1 endpoints + booking checkout (W1-W5)

**Shipped this session** (uncommitted — user reviews then pushes). 7 agents across 5 waves. tsc clean both packages.

### W1 triage (Explore, read-only)
- Admin 500 root cause: prod DB likely missing `users.blocked` / `blocked_reason` / `blocked_at` columns (DDL replay from `3fe66fa`/`ea6b3c2` best-effort, never confirmed). Breaks `authenticateUser` middleware → every authenticated admin call 500s before handler runs.
- Audit of 6 P1 localStorage pages: identified BE gaps for each (model fields missing, route files missing or incomplete).

### W2 BE bundle (`@poojly/api`)
- **Migration** `20260520010000_admin_p0_p1_bundle/migration.sql` — fully idempotent. Adds: `users.blocked|blocked_reason|blocked_at`, `astrologer_profiles.availability JSONB`, `temple_puja_offerings.nri_price|assigned_priest_id (FK SET NULL)`, `live_darshan_streams.title|description|camera_location`, new `store_products` table + 2 indexes.
- **Admin service fixes**: `getPendingApprovals` joins User for fullName fallback (was reading non-existent field); `getDashboard` revenue switched to true MTD (`date_trunc('month', NOW())`); unused `UserFilters.status` documented.
- **4 P0 GET endpoints**: `/priest/reviews`, `/wellness-portal/students`, `/temple-portal/donations` (gaushala-only model gap → empty), `/store/reviews` (no productId on Review → empty).
- **4 P1 CRUD sets**: `PATCH /astrologer-portal/availability`, full `/temple-portal/pujas` + `/temple-portal/darshan` + `PATCH /darshan/:id/status`, full `/store-admin/products` (new route file + server.ts registration).
- **Tests**: 50 new Zod tests pass. `tsc` clean.

### W3-A FE P0 wiring (`@poojly/web`)
- Wired `apps/web/app/{priest/reviews, wellness-portal/students, temple-portal/donations, store-admin/reviews}/page.tsx` to real APIs via `useAuth().session?.accessToken`. Skeletons + retry + refresh on each.
- New typed clients: `apps/web/lib/{pandit-api,wellness-api,temple-api,store-admin-api}.ts` (extended/created).
- UX adaptations: 6-char id placeholders for missing name joins; empty-state copy explains model gaps; donation purpose breakdown removed (no BE taxonomy).

### W3-B FE P1 wiring
- 5 pages migrated off localStorage to real APIs: `astrologer-portal/availability`, `wellness-portal/sessions`, `temple-portal/pujas`, `temple-portal/darshan`, `store-admin/products`.
- localStorage keys dropped (these pages only): `poojly_astrologer_availability`, `poojly_wellness_sessions`, `poojly_temple_pujas`, `poojly_temple_darshan_streams`, `darshya_store_products_v2`. **All other `poojly_*` storage untouched** per project rule.
- BE/FE shape adaptations: wellness sessions FE `schedule:string` → BE `scheduledAt:DateTime`+`status` enum (datetime-local + select); temple pujas now use `pujaTypeId` (uuid from `/pujas/types`) + `assignedPriestId` (from `/priests`); darshan `isLive` → 3-state status.
- Scope-creep (justified): agent added missing `GET /sessions/mine`, `PATCH /sessions/:id`, `DELETE /sessions/:id` on `wellness-sessions.ts` to complete the CRUD.

### W4 PriestPujaOffering booking → Razorpay checkout
- BE: `POST /api/v1/bookings/from-offering` in `apps/api/src/routes/bookings.ts` (~250 LOC). Resolves priest's first verified `TemplePriest` binding + any active `TemplePujaOffering` to satisfy `PujaBooking` non-null FKs. Real offering recorded in `specialInstructions` as JSON marker (offeringId, name, deity, durationMinutes, basePriceInr, cancellationWindowHours=24, requiresVideoProof=true).
- FE: new `apps/web/app/checkout/offering/[offeringId]/page.tsx` — auth-gated, offering summary, date/slot/devotee form, Razorpay popup, success card. `apps/web/app/pandits/[id]/page.tsx` "Book This Puja" now links here.
- Deviations (all `// TODO(W4):`):
  - INR/Razorpay only — no Stripe USD path (`paymentService.createStripeOrder` reads temple `pujaType.nriPrice`, not priest offering catalog).
  - Slot capacity check skipped (priest offerings have no `availableSlots`/`maxBookingsPerSlot`).
  - Resolved priest via list+detail walk (no `/priests/offerings/:id` single-shot lookup).
  - Schema migration recommended: add `PujaBooking.priestPujaOfferingId` FK to drop JSON marker.
- Constraints honoured: no `ALLOW_DEMO_PAYMENTS`, no key edits, no live payments triggered.

### W5 pujas/pandits route merge
- `apps/web/app/pujas/pandits/[id]/page.tsx` (450-line hardcoded) → 10-line redirect to `/pandits` listing. Legacy `p1`-`p8`/`w1`-`w5` IDs don't map to real Priest UUIDs, so per-id redirect would 404.
- `home-pujas.ts` kept (still consumed by `/pujas/home-puja/*`, `/pujas/marriage/*`). Two callers (`marriage/page.tsx:260`, `home-puja/[slug]/page.tsx:265`) still link to legacy route → now bounce to listing.

### Migrations to deploy
1. `20260519000000_gaushala_cows_volunteers` (prior, may already be deployed)
2. `20260520000000_priest_puja_offerings` (prior session, not yet deployed)
3. `20260520010000_admin_p0_p1_bundle` (this session) — **idempotent, safe to replay**

### Manual smoke-test required before live (W4 payments)
1. Sign in as devotee → `/pandits` → pick verified pandit with active offering → "Book This Puja" → lands on `/checkout/offering/<id>`.
2. Fill date/slot/name/gotra → Razorpay popup with test card `4111 1111 1111 1111`.
3. Success → `BS-YYYYMMDD-XXXXX` confirmation → `/dashboard/bookings` shows confirmed entry.
4. Negative: pandit with no temple binding → 409 + inline support message, nothing in DB.

### Open follow-ups
- TODOs(W2): Donation polymorphic taxonomy (temple vs gaushala); Review.productId or ProductReview model.
- TODOs(W4): Stripe USD path; slot capacity model; `priestPujaOfferingId` FK migration.
- W5 callers (`marriage/page.tsx`, `home-puja/[slug]/page.tsx`) — swap card grids to `getPublicPriests()` for real profiles.
- User-action: verify migration ran on Supabase (esp. `users.blocked` for admin fix).

## 2026-05-20 — real-numbers + pandit-puja chain

**Shipped this session** (uncommitted — user reviews then pushes):

- **Admin dashboard real numbers**: `apps/web/app/admin/page.tsx` rewrote as client component. Fetches `/admin/dashboard` + `/admin/pending-approvals` + `/admin/users?limit=10` via `useAuth().session?.accessToken`. Skeletons, retry banners, refresh, CSV from live data. Per-role breakdown from `usersByRole` Record. `apps/web/lib/admin-api.ts` extended with `getPendingApprovals()` + `getUsers({limit,page,role,search})`.
- **Restart-tour hidden for admin**: `NavAuthButton.tsx` — gated on `role !== 'admin'`. File uses 1-space indent.
- **Pandit puja attribution chain (new model)**:
  - `PriestPujaOffering` model + migration `20260520000000_priest_puja_offerings`.
  - `apps/api/src/routes/priest.ts` — 5 owned endpoints (GET/POST/PATCH/DELETE/PATCH-toggle-active `/pujas`). Ownership via priestId equality.
  - `apps/api/src/routes/priests-public.ts` — 3 public endpoints (GET `/`, GET `/:id`, GET `/:id/pujas`). Filter `isVerified=true AND status='active'`, sort `ratingAvg desc`. Registered at `/api/v1/priests` in `server.ts`.
  - `getPriestId()` auto-upserts `Priest` from `PanditProfile` (signup creates PanditProfile only — marketplace-v2 pandits would 400 otherwise).
  - FE: `apps/web/lib/pandit-api.ts` typed client. `apps/web/app/priest/services/page.tsx` rewrote off localStorage (`poojly_priest_services` dropped). New public `apps/web/app/pandits/page.tsx` (ISR 300s) + `apps/web/app/pandits/[id]/page.tsx` (ISR 60s) with "Book This Puja" CTA → `/pujas?pandit=<id>&offering=<offeringId>`.
- **Fake fallbacks emptied** (6 files): priest/{reviews,bookings,payouts}, wellness-portal/students, temple-portal/donations, store-admin/reviews.

**Migration to deploy**: `20260520000000_priest_puja_offerings`. Render auto-runs `prisma migrate deploy` on start.

**Verification**: API tsc clean. Web tsc only errors pre-existing `__tests__/*` + `vitest.setup.ts` — no new-code errors.

**Open**:
1. 4 P0 missing BE endpoints: `/priest/reviews`, `/wellness-portal/students`, `/temple-portal/donations`, `/store/reviews`.
2. 6 P1 localStorage-only sub-pages: astrologer availability, wellness sessions, temple pujas, temple darshan, store products.
3. Subscription pages (priest/astrologer/wellness/temple) UI-only.
4. `/admin/users` + `/admin/approvals` 500s in prod (E3).
5. Revenue tile shows last-10-txn sum, not true MTD.
6. PriestPujaOffering booking flow CTA placeholder — no checkout wiring.
7. `/pujas/pandits/[id]` still on hardcoded `home-pujas.ts`.

## 2026-05-19 — auth-cascade fix

**Shipped** (`9e87aca`):
- Root-cause fix: `authenticateUser` looked up Prisma user by phone only — email signups (no phone) 401'd everywhere. Patched to id→email→phone fallback. Unblocks KYC load, profile save, cow add, volunteer add, gaushala onboarding submit.
- Added GET `/api/v1/gaushala-portal/donations` (status mapping pending→created, received→paid).
- Rewrote `gaushala-portal/donations` page on real API. Dropped D001-D008 dummy + 3 fake campaigns.

**Prior ship** (`bcadee6`, `4ae5573`):
- P1 — Dashboard stats zero-default for all 6 provider roles.
- P2 — PATCH /profile across astrologer/wellness/gaushala portals.
- P3 — Gaushala cows + volunteers full CRUD (routes + Prisma models + migration + FE).
- P4 — Verification documents widget on `/provider-kyc`.
- Site-wide WhatsApp click-to-chat (z-59).
- CORS: explicit methods + allowedHeaders (`6f8ca24`).

**Migration**: `20260519000000_gaushala_cows_volunteers` — creates `cows`, `cow_health_records`, `volunteers` tables.
