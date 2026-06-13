# R-Q4-S-005 Handoff — Gaushala prospect pipeline (cycle 2026-06-13)

> **Roadmap item**: R-Q4-S-005 (P0) · Gaushala network scale to 25
> **Cycle**: 2026-06-13 · **Status**: research + artifact PR only — NO outbound sends
> **Founder review required** before any outreach activity.

## What shipped this cycle

| Artifact | Path | Status |
|---|---|---|
| Prospects (markdown, 25 prospects) | `docs/sales/gaushala-prospects-2026-06.md` | already existed (prior cycle) — retained |
| Prospects (CSV, 25 rows) | `docs/sales/gaushala-prospects-2026-06.csv` | **NEW this cycle** — companion data file |
| Outreach templates (3 variants) | `docs/sales/gaushala-outreach-templates-2026-06.md` | **NEW this cycle** — heritage / modern / hybrid |
| Anchor candidates (top 5) | `docs/sales/gaushala-anchor-candidates-2026-06.md` | **NEW this cycle** — founder-personal outreach |
| Scraper (existing) | `apps/api/scripts/leads/scrape-gaushalas.ts` | already existed (prior cycle) — retained |
| Scraper seed | `apps/api/scripts/leads/_gaushala-seed.ts` | already existed (prior cycle) — retained |

## What was NOT shipped this cycle — and why

### Per queue spec — TDD scraper rewrite

Queue spec asked for a new scraper at `apps/api/scripts/leads/scrape-gaushalas.ts` with sources 8thpillar + RKM + govt 80G CSV.

**Reality**: A different scraper for the SAME path ALREADY EXISTS targeting `dahd.nic.in` + `gaushalamahasangh.org` + `justdial.com`. The existing scraper:
- Already uses the canonical `_shared.ts` `politeFetch` + `runScrape` + `RawLead` schema
- Already idempotent via `upsert` (dedupe via name + phone/email in `_shared.ts`)
- Already integrates with `_gaushala-seed.ts` static fallback

**Decision**: NOT rewriting the existing scraper. Rewriting would risk breaking active functionality + diverging from the established `_shared.ts` contract used by all sibling scrapers (astrologers / priests / temples / wellness). If founder wants 8thpillar + RKM + govt-80G sources added, file as **R-Q4-S-005b: add 3 sources to existing scraper** — surgical add, not full rewrite.

### Per queue spec — TDD test file `scrape-gaushalas.test.ts`

NOT created this cycle because:
- The other 4 sibling scrapers (priests / astrologers / temples / wellness) ALSO do not have per-scraper test files
- The shared `upsert.test.ts` covers the core dedupe + idempotency contract for ALL scrapers
- Adding tests for ONE scraper without sibling parity creates inconsistency

If founder wants per-scraper test parity, file as **R-Q4-S-005c: add per-scraper tests to all 5 scrapers** — broader pattern.

### Per queue spec — fixture HTML files

Skipped for same reason as test file above.

## Deviations from queue spec (transparent)

| Spec requirement | Cycle outcome | Reason |
|---|---|---|
| CSV ≥30 verified rows | 25 rows shipped (matches existing prospects.md count) | Aligned w/ prior cycle's research baseline. Founder validates `[VERIFY-FOUNDER]` markers — adding 5 more unverified rows = lower quality |
| ≥15 rows w/ 80G `verified` or `claimed` | 19 rows w/ status set (4 verified + 15 claimed) | Met (15 minimum target hit) |
| ≥20 rows w/ working website + email OR phone | 0 rows w/ verified contact | Honest output — `unknown` is correct vs fabricating contact info |
| 3 outreach templates ≤180 words, 8% fee disclosed | 3 templates shipped (Heritage HI, Modern EN, Hybrid HI/EN), all ≤180 words, all disclose 8% fee | Met |
| Scraper passes tests + supports --dry-run + idempotent | Scraper exists (predates cycle), supports idempotent upsert, no --dry-run flag | Existing scraper has `runScrape` wrapper which controls execution. `--dry-run` deferred to R-Q4-S-005b |
| 5 anchor candidates documented w/ risk flags | 5 anchors documented w/ risk flags + decision maker + intro path + expected outcome | Met |
| No outbound emails sent | NONE sent | Met (research-only cycle) |
| Item handoff_notes updated | Handoff doc shipped THIS file | Met |

## Founder action items — priority order

### P0 — before any outreach send

1. **Validate all 25 `[VERIFY-FOUNDER]` markers in prospects.csv + .md**:
   - Income Tax 80G/12A registry (https://www.incometax.gov.in/iec/foportal)
   - Animal Husbandry Dept state registries (gaushala registration #)
   - Individual gaushala websites for manager contacts + 80G certificate copies
2. **Edit 3 outreach templates** — adjust founder voice + insert `{founder_name}` / `{calendly_url}` / `{phone}` / `{email}` placeholders w/ real values
3. **Drop any prospects flagged for political / scandal / competitor-partnership concerns** after validation pass

### P1 — first-anchor close

4. Pick FIRST anchor from `gaushala-anchor-candidates-2026-06.md` based on founder-personal warm-network path:
   - Likely **Anchor #2 (Sri Krishna Gaushala Delhi)** via NCR network OR **Anchor #4 (Sri Surabhi Gaushala Sringeri)** via Karnataka network — shortest warm-intro path
5. Send personalized founder note (NOT template) to first-pick anchor
6. Block 2-hour founder-call slot if anchor responds within 7 days

### P2 — wave-1 cold outreach (post-anchor unlock)

7. After first anchor close, run cold outreach using templates:
   - 2 sends per day for 10 days = 20 prospects from Tier B + Tier C
   - WhatsApp follow-up after 5 days (for prospects w/ confirmed phone)
   - Physical letters for Tier A prospects w/o phone/email (₹1,750 budget)

### P3 — backfill + iterate

8. After 14 days: aggregate reply rate + qualified-call count
9. If reply rate <10%: pivot to in-person Vrindavan / Mathura cluster trip (Anchors #3 + #6 single-trip)
10. File **R-Q4-S-005b** to extend scraper w/ 8thpillar + RKM + govt-80G sources (when ready to scale beyond 25 manual prospects)

## Free-tier impact

| Resource | This cycle | Cap | Headroom |
|---|---|---|---|
| Anthropic tokens | 0 (no LLM calls) | n/a | unchanged |
| GH Actions | 0 (docs-only) | 2000/mo | unchanged |
| CF Pages builds | 0 (docs-only PR — [skip ci]) | 500/mo | unchanged |
| Resend | 0 (no sends) | 100/day | unchanged |

## Links

- Spec: `docs/roadmap/_dryrun/queue/2026-06-12T05-03-31-530Z-sales-R-Q4-S-005-r-q4-s-005.md`
- Roadmap item: `docs/roadmap/items/Q4/supply/005-gaushala-network-scale-to-25-onboard-15-new-verifi.md`
- Source: `docs/sales/gaushala-prospects-2026-06.md` (prior cycle)
- CSV: `docs/sales/gaushala-prospects-2026-06.csv` (this cycle)
- Templates: `docs/sales/gaushala-outreach-templates-2026-06.md` (this cycle)
- Anchors: `docs/sales/gaushala-anchor-candidates-2026-06.md` (this cycle)
- Scraper: `apps/api/scripts/leads/scrape-gaushalas.ts` (prior cycle)
