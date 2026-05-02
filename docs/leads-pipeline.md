# Leads Pipeline

Three-track lead acquisition for Darshya outreach:

1. **Manual** — hand-verified contacts in `apps/api/scripts/leads/_real-contacts-2026-05-02.ts` (110 rows, 5 roles).
2. **Apollo enrichment** — auto-fetched ICP-matched contacts via Apollo.io.
3. **Bengaluru pandits (week-1 GTM)** — hand-curated local pandit list in `_real-pandits-bengaluru-2026-05-02.ts` (23 rows, all `PRIEST` role until a `PANDIT` enum is added). City-focused for the first sales pipeline.

All three feed the same `Lead` table via `upsertLead` (idempotent by `(role, email)` or `(role, phone)`).

## Quick start

```bash
# 1. (one-time) put APOLLO_API_KEY in apps/api/.env
echo "APOLLO_API_KEY=..." >> apps/api/.env

# 2. enrich — writes apps/api/scripts/leads/_apollo-contacts-<YYYY-MM-DD>.ts
pnpm --filter @poojly/api enrich-leads

# 3. import to DB (manual = default)
pnpm --filter @poojly/api import-leads                              # manual only
LEADS_SOURCE=apollo pnpm --filter @poojly/api import-leads          # apollo only
LEADS_SOURCE=both   pnpm --filter @poojly/api import-leads          # manual + apollo
LEADS_SOURCE=bengaluru-pandits pnpm --filter @poojly/api import-leads  # week-1 Bengaluru
```

## Apollo free-tier credit budget

Apollo free plan = **60 credits/month**. Each surfaced person ≈ **1 credit**.

Default config (5 ICPs × `per_page: 10` × 1 page) = **≤ 50 credits/run**. Safe for one full enrichment per month.

Tunables (env):

| Var | Default | Max |
|---|---|---|
| `APOLLO_PER_PAGE` | `10` | `100` |
| `APOLLO_PAGES` | `1` | `10` |
| `APOLLO_MAX_PER_ICP` | `100` | `500` |

If you bump these on a paid plan, plan for `5 × per_page × pages` credits per run.

## ICP queries

Hardcoded in `enrich-from-apollo.ts`:

| Role | `q_organization_keyword_tags` | `person_titles` | `person_locations` |
|---|---|---|---|
| TEMPLE | `temple`, `mandir` | administrator, manager, trustee | India |
| GAUSHALA | `gaushala` | administrator, manager, trustee | India |
| ASTROLOGER | `astrologer` | administrator, manager, trustee | India |
| WELLNESS_INSTRUCTOR | `wellness` | administrator, manager, trustee | India |
| PRIEST | `priest`, `pandit` | administrator, manager, trustee | India |

Edit `ICPS` in the script to retune.

## Compliance / data handling

- **Email-only.** Phone numbers from Apollo are dropped before persistence (`apolloToRaw` in `import-leads.ts`, and the enrichment script never includes a `phone` field). Only the manual research dataset persists phones.
- Apollo returns `email_not_unlocked@...` placeholders for paywalled contacts — these are filtered in `apollo.service.ts::isUsableEmail`.
- All Apollo responses run through Zod validation (`ApolloSearchResponse`) before mapping.

## Graceful degradation

| Condition | Behaviour |
|---|---|
| `APOLLO_API_KEY` missing | Both `apollo.service.ts::searchPeople` and `enrich-from-apollo.ts` no-op; the latter prints "APOLLO_API_KEY not set — skipping" and exits 0. |
| Apollo API non-2xx / network fail | `searchPeople` logs warn + returns `[]`. Enrichment continues with other ICPs. |
| Zod validation fails | `searchPeople` logs warn + returns `[]`. |
| No `_apollo-contacts-*.ts` file when `LEADS_SOURCE=apollo` | `import-leads` warns and falls through (0 inserted) without erroring. |

## Fallback to manual file

If Apollo enrichment is unavailable (no key, hit credit cap, API down), the manual `_real-contacts-2026-05-02.ts` dataset remains the source of truth. Default `LEADS_SOURCE=manual` runs nothing Apollo-related.

## Files

- `apps/api/src/services/apollo.service.ts` — typed Apollo client, Zod-validated.
- `apps/api/scripts/leads/enrich-from-apollo.ts` — generates `_apollo-contacts-<date>.ts`.
- `apps/api/scripts/leads/import-leads.ts` — unified importer.
- `apps/api/scripts/leads/_real-contacts-2026-05-02.ts` — manual dataset.
- `apps/api/scripts/leads/_real-pandits-bengaluru-2026-05-02.ts` — Bengaluru week-1 GTM seed.
- `apps/api/scripts/leads/_apollo-contacts-<YYYY-MM-DD>.ts` — auto-generated, do not edit.
