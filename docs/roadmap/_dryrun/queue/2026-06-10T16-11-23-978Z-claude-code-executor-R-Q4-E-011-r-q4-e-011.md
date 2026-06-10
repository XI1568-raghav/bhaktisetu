---
queueId: Q-C-20260610T1611-R-Q4-E-011
itemId: R-Q4-E-011
role: claude-code-executor
emittedAt: 2026-06-10T16:11:00.000Z
cycle: C-20260610T1611
priority: P1
estTokens: 85000
estMinutes: 90
featureFlag: festival_presale_enabled
prFlag: separate-pr
founderActionRequired: false
---

# /goal Festival pre-sale calendar (R-Q4-E-011)

Cave goal: ship 60-day-ahead festival booking. Diwali money. No invent path — read first, then write.

## Context (read these first, do not assume)
- `prisma/schema.prisma` — current Booking + Pandit model
- `apps/web/app/festivals/page.tsx` — existing festival listing (extend)
- `apps/web/lib/festivals.ts` — festival data helpers (reuse)
- `apps/api/src/routes/pujas.ts` — pricing + booking creation pattern (mirror)
- `apps/api/src/routes/bookings.ts` — Razorpay intent pattern (if exists; else search `razorpay` in apps/api/src)
- `apps/web/lib/pricing.ts` — price calc (reuse, do not duplicate)
- `.github/workflows/` — confirm health-smoke job; total run must stay <50min

## Scope (this PR only)
1. **Prisma migration** — add table `festival_presale_slots`:
   - `id` (cuid pk), `festival_id` (string, FK-soft to festival slug), `puja_type` (string), `pandit_id` (cuid, FK Pandit), `slot_datetime` (timestamptz), `capacity` (int), `booked_count` (int default 0), `early_bird_pct` (int 0–100), `price_inr` (int), `city` (string), `created_at`, `updated_at`
   - Index: `(festival_id, slot_datetime)`, `(city, slot_datetime)`
   - Add nullable `festival_slug` + `presale_slot_id` columns to existing `Booking` table (no default backfill needed)
   - Migration via `pnpm prisma migrate dev --name festival_presale_slots` locally, then prod via `prisma db execute` per existing pattern

2. **API** (Fastify, mirror `routes/pujas.ts` style):
   - `GET /api/v1/festivals/upcoming` → returns slots where `slot_datetime BETWEEN now() AND now()+60d` AND `booked_count < capacity`; filter by `?city=` `?festival=`
   - `POST /api/v1/festivals/:slotId/reserve` → body `{ user_id, contact, address }`:
     - **Atomic capacity decrement**: use Prisma `$transaction` with `updateMany` where `id=slotId AND booked_count < capacity` then check affected rows; reject 409 if zero
     - Create Booking with `status='presale_reserved'`, `presale_slot_id=slotId`, `festival_slug=...`
     - Create Razorpay order for 25% deposit (`amount = price_inr * 0.25 * 100` paise)
     - Return `{ booking_id, razorpay_order_id, amount, deposit_pct: 25 }`
   - Both routes behind `if (!flags.festival_presale_enabled) return reply.code(404).send()`

3. **Web** — new route `apps/web/app/festivals/pre-sale/page.tsx`:
   - Server component lists upcoming slots from API
   - Client component for countdown UI (use `date-fns` if already in deps, else `Intl.RelativeTimeFormat`)
   - "Reserve with 25% deposit" CTA → Razorpay Checkout widget (mirror existing booking flow if present in `apps/web/app/bookings/`)
   - Feature flag check via existing flag helper (search `flags.` in apps/web/lib)

4. **Feature flag** `festival_presale_enabled`:
   - Add to whatever flag config exists (search `feature_flag` or `flags.ts` in repo). Default **false** in prod, **true** in dev/preview.

5. **Seed script** `prisma/seeds/festival_presale.ts`:
   - 3 Diwali slots (2026-11-12 morning/afternoon/evening) × top 5 cities (Mumbai, Delhi, Bangalore, Pune, Hyderabad) = 15 rows
   - 2 Navratri slots (2026-10-13) × same 5 cities = 10 rows
   - Pandit assignment: pick existing pandits via `findMany({take:1, where:{city}})`; if none, skip + log
   - Run via `pnpm tsx prisma/seeds/festival_presale.ts`; idempotent (upsert on `festival_id+slot_datetime+city+puja_type`)

## TDD (test-first, superpowers doctrine)
Write these **before** implementation. Run red → green:

1. `apps/api/test/routes/festivals.test.ts`:
   - `GET upcoming` returns only slots within 60d window and with capacity left
   - `POST reserve` atomic: spawn 5 concurrent reserves on `capacity=1` slot → exactly 1 succeeds, 4 get 409
   - `POST reserve` creates booking with `status='presale_reserved'` and deposit = 25% of price
   - Feature flag off → both endpoints 404

2. `apps/web/test/festivals-presale.test.tsx` (if vitest+RTL configured; else playwright smoke):
   - Page renders slot list
   - Countdown updates
   - Flag off → 404

## Verify (run before PR open)
```bash
pnpm install
pnpm prisma migrate dev --name festival_presale_slots
pnpm tsx prisma/seeds/festival_presale.ts
pnpm test --filter @bhaktisetu/api -- festivals
pnpm test --filter @bhaktisetu/web -- festivals-presale
pnpm --filter @bhaktisetu/api dev &
sleep 4
curl -s http://localhost:3001/api/v1/festivals/upcoming?city=Mumbai | jq '.[] | .festival_id' | head
curl -s -X POST http://localhost:3001/api/v1/festivals/SLOT_ID/reserve \
  -H 'content-type: application/json' \
  -d '{"user_id":"test","contact":"+919999999999","address":"x"}' | jq
```
Health-smoke must still 200: `curl -s localhost:3001/health` → `{"ok":true}`.

SQL verify post-deploy (founder runs in Supabase):
```sql
SELECT COUNT(*) FROM festival_presale_slots WHERE slot_datetime > now();
-- expect >= 25
SELECT festival_slug, COUNT(*) FROM bookings
  WHERE festival_slug IS NOT NULL GROUP BY 1;
```

## Success criteria (verbatim from item)
- Festival calendar UI live at apps/web/app/festivals/[slug] with 60-day-ahead booking enabled for 8 major festivals
- Bookings table gains festival_slug column + migration shipped via prisma db execute on prod
- 5000+ pre-bookings recorded across Diwali/Navratri/Karwa-Chauth by Nov 30 2026
- Festival-aware Razorpay invoice template tested with capacity caps per temple per festival

Note: this PR seeds 2 festivals × 5 cities (Diwali+Navratri). Extending to all 8 festivals = follow-up content task. UI route is `/festivals/pre-sale` (this PR) + integrates with existing `/festivals/[slug]` if present.

## Constraints
- No new infra. Reuse existing Postgres, Razorpay keys (env), Fastify, Next.
- GH Actions: stay under 50min total (currently fresh budget).
- PR title: `feat(festivals): presale calendar + 25% deposit booking [R-Q4-E-011]`
- Keep diff focused; do not refactor unrelated code.

## Founder action (post-merge)
1. Set `FESTIVAL_PRESALE_ENABLED=true` in Vercel prod env when ready to launch
2. Run prod migration via existing `prisma db execute` runbook
3. Run seed against prod once
4. Smoke: visit `/festivals/pre-sale`, complete 1 test Razorpay booking