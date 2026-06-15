# R-Q2-F-002 — Unit Economics Refresh Handoff

**Status**: in_progress (founder-action gates KPI promotion)
**Spec**: `docs/finance/unit-econ-refresh-channel-spec.md`
**Data scaffold**: `docs/finance/unit-econ-channel-data.json`
**Refresh script**: `scripts/finance/unit-econ-refresh.mjs`
**KPI**: `unit_econ_dashboard_live` (count 0 → 1)

## Why this stays in_progress

KPI requires a **non-stale** snapshot written under `docs/agent-reports/unit-econ/`. Snapshot is non-stale only when the refresh script pulls real cohort attribution from PostHog. Agent cannot:

- Issue / paste `POSTHOG_PERSONAL_API_KEY` on founder workstation OR repo GH Actions secrets
- Decide tracked cohort definitions (e.g. "loyal" = ≥3 bookings vs ≥5 bookings)
- Approve `monthly_acquired_target` re-weighting between channels
- Authorize tripwire breach response (pause channel vs accept w/ rationale)

Per CLAUDE.md "DO NOT auto-claim status=shipped on items where KPI requires founder action".

Agent has shipped everything that can be shipped pre-founder-paste:

- Per-channel baseline projections JSON (7 channels × domestic+NRI × CAC/LTV/payback/target)
- Refresh script w/ env-or-noop + tripwire engine + snapshot writer
- Spec doc covering methodology, attribution mapping, refresh cadence, KPI promotion rules
- Dry-run smoke verified: `node scripts/finance/unit-econ-refresh.mjs` prints blended values + flags stale

## Founder action (sequential)

1. **Populate PostHog env** (~5 min):
   - Local: append `POSTHOG_PERSONAL_API_KEY=phx_...` and `POSTHOG_PROJECT_ID=<numeric>` to `.env.local`
   - GH Actions: `gh secret set POSTHOG_PERSONAL_API_KEY` + `gh secret set POSTHOG_PROJECT_ID`
   (Same secrets ARE Phase 6 founder-action item #1 — covers two roadmap items in one paste.)
2. **Tag share links w/ utm_source** (~10 min, one-time):
   - WhatsApp share buttons → `&utm_source=whatsapp`
   - Twitter posts → `?utm_source=twitter`
   - Reddit links → `?utm_source=reddit`
   - Audit `apps/web/components/Share*.tsx` for missing tags
3. **Implement PostHog query block** in `scripts/finance/unit-econ-refresh.mjs` `fetchPostHogCohort()` (~30 min):
   - Query PostHog cohorts API: per `utm_source` attribute, count distinct users w/ `paid_booking` event over last 30 / 90 days
   - Join `payment.amount_inr` sum per user to compute observed LTV
   - Replace `channel.status: 'target'` → `channel.status: 'actual'` and `confidence: 'low'` → `confidence: 'high'` when n ≥ 30 per channel
4. **First weekly refresh** (~5 min):
   ```bash
   node scripts/finance/unit-econ-refresh.mjs --write
   ls -la docs/agent-reports/unit-econ/
   ```
   Verify snapshot has `stale: false` and per-channel `actual` values.
5. **Flip KPI** in `docs/roadmap/_manual-kpis.yml`:
   ```yaml
   unit_econ_dashboard_live: 1
   ```
6. **Mark item shipped**:
   - `status: shipped` + `shipped_at: <ISO>` in `docs/roadmap/items/Q2/finance/002-unit-economics-refresh-cac-ltv-payback-per-channel.md`
   - Run validator: `node scripts/agents/roadmap/_validate-items.mjs`
7. **Schedule recurring Mon refresh** — add calendar invite "Unit econ refresh — review snapshot diff" weekly 09:00 IST + auto-run as part of ops sync.
8. **Pitch deck update**:
   - Pull blended CAC + LTV + payback from latest snapshot
   - Update `docs/finance/pitch-deck-v2-outline.md` Slide 8
   - Re-render deck via `node scripts/build-pitch-deck-pdf.mjs`

## Tripwire response playbook

If snapshot writer exits 2 (breach detected):

| Breach | Likely cause | Response |
|---|---|---|
| `blended_nri_cac_usd_max > $40` | Referral cost exceeding NRI LTV; or NRI cohort too small (n<10) → noisy CAC | Pause referral wallet credit for NRI; OR widen window to 90d if n<30 |
| `blended_domestic_payback_months_max > 3` | Domestic LTV collapse (refunds spike?) OR CAC inflation (founder hours overrun on WhatsApp warm-net) | Audit refunds row in book-keeping sheet; cap founder hours on WhatsApp warm to ≤10h/week |

If breach persists 2 consecutive weeks → escalate to ROADMAP.md "Strategy tripwires" review (NRI-only SKU fold).

## Cross-references

- `docs/finance/unit-economics-m9-audit-template.md` — M9 rigorous CA-led audit (3 months later)
- `docs/finance/unit-econ-channel-data.json` — machine-readable baseline
- `scripts/finance/unit-econ-refresh.mjs` — refresh executor
- `docs/roadmap/items/Q3/finance/002-...` — M9 audit follow-up
- `docs/roadmap/items/Q2/marketing/011-...` — referral program (CAC source)
- `ROADMAP.md` strategy tripwires — blended NRI CAC > $40 / domestic payback > 3mo

## Open questions for founder

1. PostHog cohort window — 30d (responsive) vs 90d (stable, less noisy)? Default 30d, override per-channel if n<30.
2. Founder hourly opportunity cost — current spec assumes ₹500/hr (Indian senior eng rate). Should NRI-side use $50/hr (US senior eng rate) for fair CAC comparison?
3. Cohort cut-off — count user as "acquired" on first signup OR first paid booking? Spec currently uses first paid (free signups don't count per M9 audit template).

## Estimated time to KPI promotion

- Founder env paste + utm tagging: ~15 min
- PostHog query implementation: ~30 min (Sonnet pair OR founder solo)
- First refresh + verify: ~5 min
- **Total: ~50 min wall time** once founder has PostHog dashboard credentials in hand.

## Closes

R-Q2-F-002 (agent portion). Item stays `in_progress` until founder completes 8-step action list → KPI flips → status: shipped.
