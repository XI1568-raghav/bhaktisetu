# R-Q1-G-005 — Delhi supply onboarding (5th city, handoff)

> Status: city page expanded (Akshardham + 6 more temples + 12 popular pujas + Kalkaji Shakti Peeth + Hanuman Mandir CP). Supply onboarding (25 verified pandits + 5 verified temples) gated on founder Delhi NCR trip + KYC video calls. Engineering scaffold complete; live KPI flip to 1 requires manual founder/sales action.

## Why Delhi (city-5)

- **Highest per-capita disposable income in North India.** Delhi NCR (Delhi + Gurgaon + Noida + Faridabad + Ghaziabad) ~32M population, ~12M Hindu households, dense premium demand for puja booking + astrology consult + gift-puja flows.
- **North India NRI gift-puja anchor.** Punjabi + UP/Bihar diaspora across US/UK/Canada/Australia is the largest "send puja to relatives in Delhi" lane. Mirror of the Mumbai-Gujarati lane (R-Q1-G-003), serving a different (and additive) diaspora pool.
- **Akshardham halo.** World's largest Hindu temple complex (Guinness record). Drives organic SEO + word-of-mouth pull from international tourist devotee segment.
- **Kalkaji Shakti Peeth gravitational pull.** One of the 51 Shakti Peethas — Devi-bhakta lane already mobilised in Delhi metro.
- **ISKCON East of Kailash density.** Krishna-bhakt audience pre-mobilised, warm intro pathway via existing ISKCON Mumbai/Bengaluru relationships.
- **Press + media density.** National Hindi + English press (Hindustan Times, Times of India, Dainik Jagran, Amar Ujala headquarters) — earned-media leverage from a single PR push.

## Success criteria

| # | Criterion | Status | Owner |
|---|---|---|---|
| 1 | ≥25 verified pandits in Delhi (Priest table, city='Delhi', aadhaar_verified=true) | ⏳ | Founder (Delhi trip Q1 M3 + KYC video calls) |
| 2 | ≥5 verified temples in Delhi (Temple table, city='Delhi', verified=true) | ⏳ | Founder + ops (Akshardham + ISKCON EoK + Chhatarpur + Birla + Kalkaji MoU) |
| 3 | ≥5 paid bookings completed via Delhi pandits in last 30d | ⏳ | Demand activation (post supply ready) |
| 4 | Delhi NRI gift-puja conversion (USD payment) lights up | ⏳ | NRI lane GTM (post supply ready) |
| 5 | /city/delhi page lists ≥7 temples + ≥10 puja offerings | ✓ shipped | This batch |

## What shipped this batch

- `apps/web/lib/cities.ts` — Delhi entry expanded:
  - `famousTemples` 4 → 7 (added Kalkaji Mandir, Hanuman Mandir Connaught Place, Yogmaya Mandir; renamed Birla → Birla Mandir (Lakshmi Narayan), ISKCON Delhi → ISKCON East of Kailash for precision)
  - `popularPujas` 3 → 12 (added rudrabhishek, lakshmi-puja, gift-puja-nri, janmashtami-puja, diwali-lakshmi-puja, navratri-puja, mangalwar-vrat, shani-puja, mahamrityunjaya-jaap)
  - `popularDeities` 3 → 5 (added hanuman, lakshmi — CP Hanuman Mandir + Lakshmi Narayan Birla anchors)
  - `description` expanded — NCR pool sizing + per-capita income + NRI anchor framing
  - `significance` extended — Kalkaji Shakti Peeth + North India NRI LTV positioning
- Page auto-rerenders via `/city/[slug]` SSG (revalidate=3600). No new route file.
- Criterion #5 ✅ met by re-build.

## Sales/onboarding tactics

1. **Akshardham + ISKCON East of Kailash priest outreach** — founder warm contacts via existing temple network. Akshardham's BAPS Swaminarayan org has a centralised priest pool — single MoU could unlock 10+ verified pandits.
2. **Chhatarpur pandit network** — high commission willingness; dense Brahmin supply pool in South Delhi belt.
3. **Punjabi + Brahmin Sabha boards** — Delhi Brahmin Sabha + Punjabi Mahasabha WhatsApp boards.
4. **Hindi national press PR** — Dainik Jagran + Amar Ujala + Hindustan Times Hindi edition angle on "online puja booking for NRI relatives — Delhi launch."
5. **Existing Bengaluru/Varanasi/Mumbai pandit referrals** — warm-intro lane via cross-city Brahmin Sabha network (Pandit-of-Pandits referral chain).
6. **Delhi Tourism + DTTDC partnership probe** — Akshardham + Kalkaji + Chhatarpur are on the Delhi Tourism circuit; co-marketing angle worth a 1-hour pitch.

Each verified pandit MUST have `aadhaar_verified=true` per business rule #4 (Aadhaar gate on priest payout). Manual cross-check via official Aadhaar e-KYC portal — Darshya does NOT auto-verify.

## Founder action (BLOCKING)

1. **3-day Delhi NCR trip Q1 month 3** (per agent_brief). Cover South Delhi (Chhatarpur + ISKCON EoK), Central (CP Hanuman + Birla), East (Akshardham), South-East (Kalkaji).
2. KYC video calls with first 25 pandits (Delhi, 2026-Q1).
3. Aadhaar verification (manual cross-check via official Aadhaar e-KYC portal — Darshya does NOT auto-verify).
4. Temple onboarding MoU (5 temples — Akshardham + ISKCON EoK + Chhatarpur + Birla + Kalkaji) — verified=true flip in `/admin` only after MoU signed.
5. After both: Decision Agent KPI scrape `city_active_delhi` should flip to 1.

## Dependencies

- Coordinates with broader Q1 supply onboarding sales pipeline (mirror of R-Q1-S-003 Mumbai pandit drive + R-Q1-S-006 Mumbai temple MoU pattern, applied to Delhi).
- Reuses Aadhaar verification flow (business rule #4) and `/admin` temple-verified flip workflow shipped in prior city launches.

## KPI query (Supabase)

```sql
SELECT CASE
  WHEN (SELECT COUNT(*) FROM "Priest" WHERE city='Delhi' AND aadhaar_verified=true) >= 25
   AND (SELECT COUNT(*) FROM "Temple" WHERE city='Delhi' AND verified=true) >= 5
  THEN 1 ELSE 0 END;
```

Wire in `docs/roadmap/items/Q1/geo/005-delhi-supply-onboarding-5th-city.md` frontmatter (kpi.query) on next item refresh.

## Status framing

- `status: in_progress` — engineering scaffold done; KPI flip remains founder-action-blocked. **Do NOT auto-flip status=shipped** until KPI query returns 1 against live prod DB (per R3 retrospective on premature shipped flips).

## Deviations from spec

- Spec body was TBD-placeholder (bulk-imported 2026-06-09). This batch populated success criteria + tactics + KPI query + founder-action gates by mirroring the R-Q1-G-003 Mumbai launch pattern (proven template for city-N launches). No spec deviation — fills the TBD gap.
