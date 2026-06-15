# R-Q4-M-013 — 40% NRI mix milestone handoff

> **Status**: in_progress (engineering scaffold shipped; KPI requires founder action)
> **Roadmap item**: docs/roadmap/items/Q4/marketing/013-40-nri-mix-milestone-track-announce-investor-narra.md
> **Authored**: 2026-06-15 (batch r5)

## What shipped this batch

1. **`scripts/agents/marketing/nri-mix-tracker.mjs`** — deterministic daily/weekly NRI mix calculator with three classification bands (approaching 35% / milestone 40% / exceeded 45%). Env-or-noop: requires `SUPABASE_DIRECT_URL` (or `DATABASE_URL_READONLY`). Without DB, emits a noop report with founder-action notes.
2. **Pure `calculateMix()` export** — unit-testable formula, no DB or network. Reusable in API routes, admin dashboards, or other agents.
3. **SQL templates** (`SQL_LAST_30D`, `SQL_LAST_7D`) — SELECT-only on `Booking` table, split by `currency` column (INR = India proxy, USD = NRI proxy, × 83 for paise normalisation).
4. **Cross-validation pair documented** — PostHog geo-segmentation (event-driven) + this script (DB-driven). Both must agree before milestone announcement.

## Why this is PARTIAL not GREEN

KPI `nri_mix_pct` cannot be engineered. It requires real NRI bookings landing at 40%+ for 4 sustained weeks. Engineering ships the measurement substrate and alerting; the founder drives the growth.

## Founder action — required for KPI flip

### Step 1 — wire DB env (15 min)

```bash
# On Render or local agent runner
export SUPABASE_DIRECT_URL=postgresql://...
node scripts/agents/marketing/nri-mix-tracker.mjs
# → writes docs/agent-reports/YYYY-MM-DD-nri-mix.md
```

### Step 2 — wire to weekly cron (optional, 10 min)

Add to `.github/workflows/agents-daily.yml`:

```yaml
- name: NRI mix tracker
  if: github.event.schedule == '0 4 * * 1'  # Mondays only
  run: node scripts/agents/marketing/nri-mix-tracker.mjs
  env:
    SUPABASE_DIRECT_URL: ${{ secrets.SUPABASE_DIRECT_URL }}
```

### Step 3 — NRI acquisition push (the actual KPI driver)

Per `docs/marketing/40pct-nri-milestone-spec.md` + roadmap item R-Q4-M-013:

- **NRI WhatsApp chains**: US/UK/CA/AU/SG temple community WhatsApp groups
- **Diaspora referral programme**: R-Q4-M-004 (12-month NRI temple partnership series)
- **NRI community newspaper/radio buys**: keep CAC < $40 (per tripwire in ROADMAP.md)
- **NRI annual pass SKU**: maintain ≥ 1:3 annual:per-puja ratio (tripwire)

### Step 4 — milestone announcement workflow (when 40% sustained 4 weeks)

When `nri-mix-tracker.mjs` reports `classification: milestone-reached` AND PostHog cross-validates:

1. Founder weekly investor update — call out the milestone
2. Founder Twitter thread + LinkedIn post
3. Press release (Q1 2027 if sustained 12+ weeks)
4. Series A pitch deck update — "Indian super-app w/ Hindu global reach"

## Tripwire watch

From ROADMAP.md "Strategy tripwires" — two breaches in same week → fold to NRI-only SKU:

- NRI Day-30 retention < 25% by week 8
- Blended NRI CAC > $40 by week 8
- NRI annual:per-puja ratio < 1:3 by week 12
- Sri Mandir launches USD premium tier (any time)

The tracker does NOT monitor these tripwires — they live in the broader CXO advisory layer. Manual review on the weekly investor update.

## What deliberately did NOT ship

- **No fabricated NRI mix numbers** — KPI starts at 0, target 40, source is PostHog.
- **No press-release draft** — premature without verified milestone.
- **No investor pitch slide** — premature without verified milestone.
- **No alerting integration** (Slack / email) — founder-deferred until DB env is wired in step 1.

## Closes

R-Q4-M-013 engineering scaffold (tickets a + b partial). Ticket c (external announcement coordination) blocked on KPI flip. Item stays `status: in_progress` per non-fabrication rule.
