---
queueId: Q-C-20260610T1611-R-Q4-E-010
itemId: R-Q4-E-010
role: claude-code-executor
emittedAt: 2026-06-10T16:11:00.000Z
cycle: C-20260610T1611
priority: P1
estTokens: 110000
estMinutes: 130
featureFlag: wedding_planner_v1
prFlag: separate-pr
founderActionRequired: false
scopeNote: ship draft+vendor schema + wizard MVP this cycle; polish deferred if >40h
consumedAt: 2026-06-10T18:37:46Z
consumedBy: claude-code
consumedInSessionId: unknown-session
---

# /goal Wedding planner v1 (R-Q4-E-010)

Cave goal: one transaction books muhurat + pandit + venue + catering + photographer. Big ticket weddings = ₹9L target.

**Scope decision rule** (item allows): if implementation tracks >40h, ship **schema + draft API + vendor extension + wizard steps 1–2** in this PR; defer steps 3–5 polish to follow-up. Mark deferred items in PR description.

## Context (read first, do not invent)
- `prisma/schema.prisma` — check for existing `Vendor`, `Pandit`, `Muhurat`, `Wedding` models
- `apps/web/app/weddings/page.tsx` — existing wedding landing
- `apps/web/app/weddings/inquiry/page.tsx` — existing inquiry form (extend pattern)
- `apps/api/src/routes/weddings.ts` — existing wedding endpoints (extend, do not duplicate)
- `apps/web/lib/pricing.ts` — reuse for budget calc
- Muhurat lookup: search `muhurat` in apps/api/src/routes
- Pandit booking: search `pandit` in apps/api/src/routes

## Scope (this PR)

### 1. Prisma migration
- **New table** `WeddingPackage`:
  - `id` cuid pk, `user_id` (string), `wedding_date` (date), `muhurat_id` (string nullable), `pandit_id` (string nullable FK Pandit), `venue_vendor_id` (string nullable FK Vendor), `catering_vendor_id` (string nullable FK Vendor), `photographer_vendor_id` (string nullable FK Vendor), `budget_inr` (int), `status` enum [`draft`,`vendors_selected`,`booked`,`paid`,`completed`,`cancelled`] default `draft`, `checklist_json` (jsonb), `created_at`, `updated_at`
  - Indexes: `(user_id, status)`, `(wedding_date)`
- **Vendor table extension**: add `type` enum [`pandit`,`venue`,`catering`,`photographer`]
  - If `Vendor` table doesn't exist yet: create it with `id, name, type, city, base_price_inr, contact, description, image_url, rating, active, created_at, updated_at`
  - If exists: `ALTER` to add `type` with sensible default + backfill script
- Migration: `pnpm prisma migrate dev --name wedding_package_and_vendor_type`

### 2. API — extend `apps/api/src/routes/weddings.ts`
- `POST /api/v1/weddings` → create draft (`status='draft'`), all vendor IDs optional, returns `{id}`
- `PATCH /api/v1/weddings/:id` → partial update (any field); recalculate `status` (`draft` → `vendors_selected` when all 4 vendor slots + muhurat filled)
- `GET /api/v1/weddings` → list user's weddings (auth via existing pattern; query `?user_id=` if no auth middleware)
- `GET /api/v1/weddings/:id` → single
- `GET /api/v1/vendors?type=venue&city=Mumbai` → filtered vendor list (new or extend existing vendors route)
- All behind `flags.wedding_planner_v1` (404 if off)

### 3. Web — wizard `apps/web/app/weddings/plan/page.tsx`
5-step wizard (use React state, no new state lib):
1. Date + city + budget → create draft via POST
2. Muhurat selection (call existing muhurat lookup API; show 3 options for date)
3. Pandit selection (filter by city, vedic specialization)
4. Venue + catering + photographer (3 vendor pickers; show cards from `/api/v1/vendors?type=...`)
5. Review + reserve (PATCH status=`vendors_selected`, show total = sum of base_price + pandit fee)

If implementation tracking >40h at end of step 3: ship steps 1–3 + skeleton 4–5, deferred polish noted in PR.

### 4. Feature flag `wedding_planner_v1`
- Default false prod, true dev/preview
- Wraps both API + web route

### 5. Seed vendors `prisma/seeds/wedding_vendors.ts`
- 3 venues, 3 catering, 3 photographers per top 5 cities = 45 vendors
- Idempotent upsert on `name+city+type`
- Realistic price ranges: venue ₹50k–₹3L, catering ₹500/plate, photographer ₹40k–₹1.5L

## TDD (test first)
1. `apps/api/test/routes/weddings.test.ts`:
   - POST creates draft with status='draft' and only date+budget
   - PATCH updates and transitions to vendors_selected when all 4 IDs + muhurat present
   - GET filters by user_id
   - Vendor query filters by type+city
   - Flag off → 404

2. `apps/api/test/routes/vendors.test.ts`:
   - Type filter works
   - City filter works

3. `apps/web/test/weddings-plan.test.tsx` (or playwright smoke):
   - Wizard step 1 → POST → returns to step 2 with draft id
   - Step navigation forward/back preserves state
   - Flag off → 404

## Verify
```bash
pnpm install
pnpm prisma migrate dev --name wedding_package_and_vendor_type
pnpm tsx prisma/seeds/wedding_vendors.ts
pnpm test --filter @bhaktisetu/api -- weddings vendors
pnpm test --filter @bhaktisetu/web -- weddings-plan

pnpm --filter @bhaktisetu/api dev &
sleep 4
curl -s -X POST localhost:3001/api/v1/weddings \
  -H 'content-type: application/json' \
  -d '{"user_id":"test","wedding_date":"2026-12-15","budget_inr":500000}' | jq
curl -s 'localhost:3001/api/v1/vendors?type=venue&city=Mumbai' | jq '. | length'
```
Health-smoke must remain green: `curl -s localhost:3001/health`.

Post-deploy SQL (founder):
```sql
SELECT status, COUNT(*) FROM "WeddingPackage" GROUP BY 1;
SELECT type, COUNT(*) FROM "Vendor" GROUP BY 1;
```

## Success criteria (verbatim)
- Wedding planner UI live at /weddings/planner with 5-step flow (muhurat > pandit > venue > catering > photographer)
- Weddings table + WeddingVendor table migrated to prod via prisma db execute
- 30 paid wedding bookings by Dec 31 2026 with avg ticket >= 30K INR
- Vendor marketplace integration: pandit/venue/catering/photographer all bookable in 1 transaction

Note: spec says `/weddings/planner` — using `/weddings/plan` per item agent_brief context_files convention check. If `apps/web/app/weddings/planner/` already exists, use that. Read first, decide.

## Constraints
- No new infra. Free tier only.
- Reuse `pricing.ts`, existing Razorpay flow (do not duplicate)
- PR title: `feat(weddings): planner v1 wizard + vendor schema [R-Q4-E-010]`
- GH Actions <50min combined with R-Q4-E-011 PR
- Keep migration backward-compatible (nullable cols, no destructive drops)

## Founder action (post-merge)
1. Set `WEDDING_PLANNER_V1=true` in Vercel prod env when ready
2. Run prod migration via `prisma db execute`
3. Run vendor seed against prod
4. Review 3 sample vendors per city for accuracy before launch
5. Smoke: complete 1 end-to-end draft wedding