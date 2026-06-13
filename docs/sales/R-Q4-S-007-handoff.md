# R-Q4-S-007 Handoff — Antim Sanskar Pandit Onboarding (Kashi + Haridwar + Prayagraj)

> Status: scaffolding shipped 2026-06-13. Founder must execute outreach. KPI query stub blocked on schema apply + signal-context bootstrap.

## What this batch shipped

| Artifact | Path |
|---|---|
| Cold-call + WhatsApp playbook (Hindi + Bhojpuri) | `docs/sales/playbooks/antim-pandit-onboarding.md` |
| Pipeline kanban tracker + weekly cadence | `docs/sales/trackers/antim-pandits-pipeline.md` |
| 60-prospect CRM seed CSV | `seeds/antim-pandits-prospects.csv` |
| Seed loader (stub — awaits schema) | `scripts/sales/seed-antim-pandits.ts` |
| Schema migration (stub — awaits apply tool) | `supabase/migrations/20260613000000_antim_sanskar_pandits.sql` |

## founder-action-required (BLOCKING — agent cannot do)

### 1. Schema apply path

Repo did not have `supabase/migrations/` dir prior to this batch. Founder must choose one:

- **Option A — supabase CLI**: `supabase db push` after `supabase init` and linking project ref.
- **Option B — prisma db execute** (per CLAUDE.md memory): `pnpm prisma db execute --file supabase/migrations/20260613000000_antim_sanskar_pandits.sql --schema apps/api/prisma/schema.prisma` with `DIRECT_URL` set.
- **Option C — psql direct**: `psql "$DATABASE_URL" -f supabase/migrations/20260613000000_antim_sanskar_pandits.sql`.

Verify via `node apps/api/scripts/check-prod-tables.mjs` (extend script for new table).

### 2. signal-context bootstrap

Spec referenced `signal-context/kpi-collectors.yaml` which does not exist in repo. Two paths:

- **Bootstrap signal-context dir** with a collector registry YAML, OR
- **Inline into existing roadmap KPI tooling**: add to `scripts/agents/roadmap/_kpi-supabase.mjs` (per Phase 2 ARE plan in TASKS.md) the query:
  ```sql
  SELECT COUNT(*) FROM antim_sanskar_pandits WHERE verification_status = 'verified';
  ```
  keyed under metric `antim_specialist_pandits`. Roadmap item `docs/roadmap/items/Q4/supply/007-...md` already exposes the metric.

### 3. Founder outreach execution (the actual work)

- [ ] Review 60-prospect CSV, mark obvious garbage rows
- [ ] Schedule 3 ghat visits (1 per city) — week 1
- [ ] Dial first 10 phone leads using playbook script — week 1-2
- [ ] Verify credentials in-person (checklist in playbook)
- [ ] Mark `verification_status='verified'` in Supabase after each
- [ ] Target 20 verified by month 10 close

## Verify (post founder-action)

```bash
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM antim_sanskar_pandits;"   # expect >= 60 once seed loads
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM antim_sanskar_pandits WHERE verification_status='verified';"  # 0 until founder verifies
```

Source roadmap item: `docs/roadmap/items/Q4/supply/007-onboard-20-antim-sanskar-specialist-pandits-kashi-.md`
