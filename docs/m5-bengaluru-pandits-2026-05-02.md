# M5 — Bengaluru Pandits (Week-1 GTM Seed)

**Date:** 2026-05-02
**Owner:** Sales pipeline, week-1 GTM
**Seed file:** `apps/api/scripts/leads/_real-pandits-bengaluru-2026-05-02.ts`
**Trigger:** `LEADS_SOURCE=bengaluru-pandits pnpm --filter @poojly/api import-leads`

## Why this list exists

Apollo enrichment for "pandit/priest" ICPs returns mostly generic Indian-priest org-titles outside of Bengaluru. For week-1 we want a small, geo-focused outreach pool that the founder can call by phone if the email bounces — so this dataset is hand-curated from public listings.

## How the list was sourced

Each operator was discovered through one of:

- DuckDuckGo HTML search across Bengaluru pandit/purohit/priest queries (Vedic, Iyengar/Vaishnava, Smartha/Madhwa, Bengali, Marathi, Telugu, Tamil traditions + neighborhood-targeted: Whitefield, HSR Layout, Koramangala, Jayanagar, Malleswaram, Indiranagar, Banashankari, Hebbal).
- Aggregator pages on `99pandit.com/cities/bangalore`, `smartpuja.com`, `gopuja.com`, `poojalu.com`, `pandits2u.com`, `harivara.com` that surface their own brand contacts.

For each candidate, we then **fetched the operator's own website** (the canonical source) and only kept the row if:

1. A working phone number was published on their site, AND
2. Either an email or a Bengaluru postal address was also published.

JustDial and Sulekha listings were used as **discovery hints only**. JustDial masks numbers (`080PXX80...`) so we could not extract phones directly; instead we used JustDial-listed names as queries and pulled contact info from the operator's own domain. Sulekha's `/pandit-services/bangalore` URL returned 404 on 2026-05-02 — Sulekha appears to have restructured this category.

UrbanCompany no longer publishes a `/bangalore-pandit-for-pooja` page (404). We used their app catalog as a hint for top operator brand names and traced those back to first-party sites.

## What's in the file

23 entries, all `role: 'PRIEST'` (the Prisma `LeadRole` enum has no `PANDIT` value yet — adding one is a separate schema migration).

| Field | Notes |
|---|---|
| `name` | Either the head pandit's personal name or the brand name + suffix |
| `phone` | E.164 format `+91XXXXXXXXXX` |
| `email` | Present for 19/23 — 4 phone-only operators |
| `neighborhood` | Bengaluru locality, e.g. "Jayanagar", "Whitefield", "Citywide" |
| `specialization` | Tradition (Vedic, Bengali, Marathi, Iyer/Vadhyar, Madhwa, etc.) + key puja types |
| `yearsExperience` | Filled when published on operator's own site |
| `qualityFlag` | `cluster-review` for SEO-domain group around Parapana Agrahara — see below |

### Source breakdown

- **23/23 (100%) verified directly from the operator's own first-party website** (own `.com` / `.in` domain). No JustDial/Sulekha-only rows accepted.
- **19/23 (83%) have both email + phone**; 4/23 (17%) phone-only.
- **15/23 (65%) have a named individual head pandit**; 8/23 are organisation-fronted.
- **5/23 flagged `cluster-review`**: The "Parapana Agrahara 560068/560100" SEO-domain cluster (Pt. Shailendra Pandey, Pt. Rahul Shastri, Pandit Uday Kumar Pandey, Mahamaya, plus TamilPriest sharing Pandits2u's phone) may be the same back-office under multiple branded domains. Each row has distinct phone + email + named pandit, so they're kept — but flag prompts founder to dedupe before live outreach.

### Quality gaps (transparency)

- **Below the 20-row target floor was avoided** — we ended at 23 verified rows.
- **2 single-source rows excluded** (Madhwa purohits Dwarakanath Acharya `+91 9141108752` and Venkatesh Murthy `+91 9845443403` from a `yolasite.com` directory) — we will add these back once we cross-verify on a Madhwa community list.
- **Iyengar/Vaishnava traditional purohits underrepresented** — only TamilPriest (Iyer-leaning) found via searchable web. Most Iyengar purohits are sourced via Sri Vaishnava temple offices (Ahobila Mutt, Parakala Mutt) which are in the temples dataset already.
- **Specific Smartha/Madhwa Brahmin caste-house networks** are not on the open web — they distribute via Brahmana Sangha and Rotary-style chains. Out of scope for week-1.

## Outreach plan

Wired via the existing outreach cron (`apps/api/src/jobs/master-cron.ts`):

- **First-touch cap:** 50 emails per tick (~ 1 daily-ops tick = 50 emails/day across all roles).
- **Follow-ups:** 3-day and 7-day, each capped at 50/tick.
- **Templates used:** `priest_first_touch.{en|hi}.html` (already exists in `apps/api/src/templates/outreach/`). Bengaluru-specific personalisation pulled from `metadata.neighborhood` and `metadata.specialization`.

### Throughput math

- Lead pool: **19 emailable + 4 phone-only**.
- All 19 emails fit in **one tick** (well under 50 cap), so first-touch goes out same day import is run.
- Day 4 → 19 follow-up #1 emails. Day 8 → 19 follow-up #2.
- Total emails across 8 days: **57**. Total touches per lead: **3**.
- Phone-only rows (4) get queued for manual founder follow-up; cron skips rows with no email.

### Expected reply rate

Industry baseline for cold B2B outreach in India:

- **Single-touch open rate**: 20-30%
- **3-touch reply rate**: 8-12% on cold + 15-20% on warm-context (this list has named pandit + neighborhood + specialization → "warmer" cold).
- **Realistic week-1 outcome**: 2-4 replies (10-20% on 19 emails). 1-2 likely demos. 0-1 likely sign-up.

## Constraints honoured

- Only real publicly listed contacts. No fabrication.
- Phone format: `+91XXXXXXXXXX` (E.164).
- TypeScript strict — `pnpm turbo type-check --filter=@poojly/api` is green.
- Seed file lives in `scripts/` (excluded from API tsconfig); `import-leads.ts` (in scripts but referenced via tsx) compiles cleanly.
- **Import not auto-run** — only the seed file and importer wiring are committed. User triggers outreach when ready.

## Next pass (M6 backlog)

1. Add `PANDIT` to `enum LeadRole` and migrate existing PRIEST-role pandit rows.
2. Cross-verify the 2 yolasite Madhwa purohits → re-add.
3. Source Iyengar Vaishnava purohits from Ahobila Mutt / Parakala Mutt office contacts.
4. Repeat the curation pass for Mumbai, Delhi, Chennai, Hyderabad, Pune (each ≈ 20 rows).
