# HANDOFF — Bengaluru temple leads → cold-temple-outreach agent

**Date**: 2026-06-12 (queue cycle), shipped 2026-06-13
**Queue item**: R-Q1-S-005 (sales, P1)
**Files produced**:
- `data/sales/leads-temples-bengaluru-2026-06-12.csv` — 28 verified BLR temples, 10-col schema
- `data/sales/leads-temples-bengaluru-2026-06-12.VALIDATION.md` — 8-point founder checklist
- `scripts/sales/outreach/temple-bengaluru-v1.md` — WA + Email v1 templates w/ placeholders

## Why no direct agent wiring this cycle

`scripts/agents/cold-temple-outreach.mjs` reads Lead rows from the API endpoint
`GET /api/v1/admin/ops/cold-temples?token=...` — Lead-table sourced, NOT CSV-ingest configurable.
Per queue spec step 5: "wire to outreach agent ONLY IF agent already supports CSV path config.
Else write HANDOFF describing exact integration point for next cycle."

Therefore THIS cycle ships CSV + templates only. Next cycle (or founder-action queue item)
must do the import + wire.

## Integration point for next cycle

### Option A (recommended) — import CSV → Lead rows via existing import script

`apps/api/scripts/leads/import-leads.ts` is the canonical CSV→Lead importer.
Pattern (see `apps/api/scripts/leads/_real-contacts-2026-05-02.ts` for shape):

```bash
cd apps/api
pnpm tsx scripts/leads/import-leads.ts \
  --file ../../data/sales/leads-temples-bengaluru-2026-06-12.csv \
  --role TEMPLE \
  --source bengaluru-research-2026-06-12 \
  --dry-run   # remove for real insert
```

Required column mapping (verify in import-leads.ts):
- `name` → `Lead.name`
- `primary_contact_name` → `Lead.contactName` (most rows currently UNKNOWN-RESEARCH-PENDING, must enrich first)
- `phone_or_email` → `Lead.email` if `@` present, else `Lead.phone`
- `locality` + `name` → `Lead.city` = "Bengaluru" (hardcode), `Lead.notes` = `${locality} | ${why_priority}`
- `website` → `Lead.website`
- `type` + `deity` → `Lead.tags = ['type:'+type, 'deity:'+deity]`
- `outreach_status: NEW` → `Lead.status = NEW`

### Option B — extend cold-temple-outreach agent to accept CSV fallback

Add CSV path env var (e.g. `COLD_TEMPLE_CSV_PATH`). On agent run, if env set, read CSV
instead of API. Less safe (no Lead-table dedup, no mark-contacted persistence).
Recommend Option A.

## Pre-send checklist (founder, before Phase 2 queue item)

See `data/sales/leads-temples-bengaluru-2026-06-12.VALIDATION.md` — 8 gates.
Critical blocker: **0/28 rows have verified primary_contact_name today**.
Need 15+ before send (per queue spec acceptance criterion #5).

Enrichment paths:
1. Apollo.io / Hunter.io domain scrape for 3 sites w/ confirmed domains
   (iskconbangalore.org, ragiguddatemple.com, srsmutt.org)
2. Karnataka tourism office listings for landline numbers
3. Walk-in sales to top-5 highest-footfall temples (ISKCON Bangalore, Bull Temple,
   Banashankari, Ragigudda, Kemp Fort Shiva) — same-day intel, no API spend

## Founder action required (HARD GATE per queue spec)

1. Spot-check 5 random rows for website + phone accuracy
2. Approve WA + email templates (Kannada phrasing review)
3. Set `RESEND_API_KEY` + `ADMIN_OPS_TOKEN` in Render env
4. Explicitly green-light Phase 2 send via separate queue item

No outreach fires until all four done.

## Cost so far

- Tokens: ~6k (manual research + CSV gen + bilingual template + this HANDOFF)
- Minutes: ~15 wall-clock
- API spend: $0 (no Apollo/Hunter calls, no LLM calls, all manual research from public sources)
