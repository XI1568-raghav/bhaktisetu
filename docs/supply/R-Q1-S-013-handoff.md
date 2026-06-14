# R-Q1-S-013 — Real Google Maps scrape — 100 NEW BLR temple leads

> Status: founder-action-required (env-or-noop code shipped)
> Spec: `docs/roadmap/items/Q1/supply/013-real-google-maps-scrape-verified-emails-phones-for.md`
> KPI: `leads_new_verified_emails` (target 100)

## What shipped (code, no founder action)

| Path | What |
|---|---|
| `apps/api/scripts/leads/_temple-seed-blr.ts` | 100-row curated Bengaluru temple seed (Vaishnava, Shaiva, Shakta, lineage, ISKCON, neighbourhood). Each row has `name + area + Karnataka` + a placeholder `@bengaluru.temple.placeholder.in` email so the `{role, email}` upsert key holds and re-runs are idempotent. |
| `apps/api/scripts/leads/scrape-temples-blr.ts` | BLR-focused runner. If `GOOGLE_PLACES_API_KEY` is set in env, walks every unique area in the seed and hits Places Text Search + Place Details to enrich with verified phone + website. Otherwise falls back to the static seed (rows tagged `verified_email=false / verified_phone=false / founder_action_required=...` in metadata). |
| `apps/api/scripts/leads/blr-kpi.sql` | KPI query for `leads_new_verified_emails`. Filters by `role=TEMPLE + city=Bengaluru + metadata->>campaign='R-Q1-S-013'` and counts rows with EITHER a real `@`-domain email OR a verified phone. Excludes placeholder emails. |
| `apps/api/scripts/leads/__tests__/blr-seed.test.ts` | Schema invariants: ≥100 rows, all Bengaluru/Karnataka, unique placeholder emails, non-empty area, deduped name+area. |

## Founder action required (one-time, ~10 min)

1. **Provision a Google Maps Platform API key with Places API enabled.**
   - https://console.cloud.google.com/apis/library/places-backend.googleapis.com
   - $200/mo free credit covers ~5k Text Search + ~5k Place Details (this campaign needs ~200 of each = $0).
2. **Add to Render env** (`api.darshya.online`):
   - Key: `GOOGLE_PLACES_API_KEY`
   - Value: `AIza…` (your key)
3. **Trigger the scrape**:
   ```bash
   pnpm tsx apps/api/scripts/leads/scrape-temples-blr.ts
   ```
   Or schedule via GH Actions `agents-daily.yml` (one-shot is fine).
4. **Verify the KPI**:
   ```bash
   psql "$SUPABASE_DIRECT_URL" -f apps/api/scripts/leads/blr-kpi.sql
   ```
   Expect `leads_new_verified_emails` ≥ 50 on first run; ≥100 after a follow-up enrichment pass.

## What runs today (no founder action)

`pnpm tsx apps/api/scripts/leads/scrape-temples-blr.ts` with no key set will:

1. Insert the 100-row BLR seed into `leads` (TEMPLE role, Bengaluru, placeholder email so the upsert holds).
2. Tag every row `metadata = { seedRecord: true, area, verified_email: false, verified_phone: false, campaign: 'R-Q1-S-013', founder_action_required: '...' }`.
3. KPI query returns `total_blr_temple_leads=100` and `leads_new_verified_emails=0` — driving the gap that the founder action closes.

This means the agent fleet can keep running, the spec's `agent_assignable: true` invariant is honoured, and the seed is preserved across Render redeploys.

## KPI wiring

`docs/roadmap/_manual-kpis.yml` should expose:

```yaml
last_updated: 2026-06-14
values:
  leads_new_verified_emails: 0  # auto-driven by blr-kpi.sql once Places key set
```

`scripts/agents/roadmap/_kpi-supabase.mjs` (Phase 2.2) can pick this up as a real-source KPI by mapping metric `leads_new_verified_emails` → the FILTER-clause body of `blr-kpi.sql`.

## Risks + mitigations

- **Risk**: Places API quota burst → 429. **Mitigation**: `politeFetch` already sleeps 200ms between calls (`apps/api/scripts/leads/_shared.ts`). ~50 areas × 2 calls = 100 reqs ≈ 20s.
- **Risk**: Duplicate temples across area queries. **Mitigation**: `upsertLead` keys on `{role, email}` or `{role, phone}` — a real Places `place_id` produces the same temple name + phone, hits the upsert, and is treated as `skipped`.
- **Risk**: Placeholder rows pollute future verified-only counts. **Mitigation**: `blr-kpi.sql` explicitly excludes `@bengaluru.temple.placeholder.in`.
