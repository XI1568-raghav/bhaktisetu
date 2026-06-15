# R-Q2-G-003 — Delhi soft launch (handoff)

> Status: city page expanded; supply onboarding (25 pandits + 5 temples) + 1K MAU activation gated on founder action + organic growth. Engineering scaffold complete; live KPIs require manual + paid acquisition steps.

## Success criteria

| # | Criterion | Status | Owner |
|---|---|---|---|
| 1 | 25 verified pandits in Delhi (Priest table, city ILIKE '%delhi%', aadhaar_verified=true) | ⏳ in_progress | Founder (KYC video calls + Aadhaar verify) — depends on R-Q2-S-003 |
| 2 | 5 verified temples in Delhi (Temple table, city ILIKE '%delhi%', verified=true) — Akshardham + Birla + 3 others | ⏳ in_progress | Founder + ops (verify partnership MoU) — depends on R-Q2-S-006 |
| 3 | 1000 Delhi MAU (distinct UserSession 30d where User.city ILIKE '%delhi%') | ⏳ in_progress | Demand activation (post supply ready) |
| 4 | `/city/delhi` page lists ≥5 temples + ≥10 puja offerings | ✓ shipped | This batch (target value — actual data still pending) |
| 5 | Sales pipeline: 3+ leads/week from `/city/delhi` PostHog cohort | ⏳ in_progress | PostHog cohort + sales follow-up post-launch |

> **Per repo doctrine (KNOWN PITFALLS R1+R2+R3):** This item is `agent_assignable: true` but KPI requires founder action (25 pandit KYC + 5 temple MoU + 1K MAU activation). Engineering ships scaffold + handoff; `status` stays `in_progress` until founder closes manual steps.

## What shipped this batch

- `apps/web/lib/cities.ts` — Delhi entry expanded:
  - `famousTemples`: 4 → 10 (added Kalkaji, Hanuman Mandir CP, Yogmaya Mehrauli, Jhandewalan Devi, Gauri Shankar Chandni Chowk, Sankat Mochan Dhaula Kuan)
  - `popularDeities`: 3 → 5 (added Hanuman, Vishnu)
  - `popularPujas`: 3 → 12 (added rudrabhishek, sundarkand-path, mahalakshmi-puja, durga-saptashati-path, kaal-sarp-dosh-nivaran, 4 sanskaras)
  - `nearbyYatra`: added (ayodhya-kashi, do-dham)
  - Expanded `description` + `significance` with Kalkaji Shakti Peeth, CR Park/Karol Bagh/Paharganj/Mehrauli pandit pool, NRI corridor framing
- Page auto-rerenders via `/city/[slug]` SSG (revalidate=3600). No new route file required.
- Criterion #4 (`≥5 temples + ≥10 pujas surfaced`) — target value met by content scaffold. **Live verified counts still depend on R-Q2-S-003 + R-Q2-S-006 supply ramp.**

## Sales / onboarding tactics (per `agent_brief`)

1. **WhatsApp outreach** — ISKCON Delhi + Birla Mandir + Chhatarpur pandit contacts (founder warm intro via temple management).
2. **CR Park / Karol Bagh community circuits** — Bengali Brahman Sabha (CR Park), Punjabi Brahman Sabha, UP/Bihar pandit associations.
3. **Google Maps temple scrape + cold call** — top-50 by review count in Delhi NCR bbox; filter to public verified temple admin numbers (no scraping of private contacts).
4. **Cold temple outreach automation** — re-run `scripts/agents/cold-temple-outreach.mjs` weekly with Delhi segment filter. Founder reviews + sends. Public-domain institutional contacts only (no fabricated person names per repo doctrine).
5. **PostHog cohort** — `city = 'Delhi'` cohort; weekly digest to sales for /city/delhi traffic + conversion funnel.

Each verified pandit MUST have `aadhaar_verified=true` per business rule #4 (puja booking video proof + payout gating).

## Founder action (BLOCKING)

1. KYC video calls with first 25 pandits — depends on R-Q2-S-003 pipeline. Stagger across Q2 month 4-5.
2. Aadhaar verification (manual cross-check via official Aadhaar e-KYC portal — Darshya does NOT auto-verify).
3. Temple onboarding MoU (5 temples): Akshardham + Birla Mandir as anchor targets; 3 of [Chhatarpur, ISKCON Delhi, Kalkaji, Hanuman Mandir CP, Yogmaya Mehrauli] as fill.
4. After supply ready: activate demand acquisition (organic SEO from `/city/delhi` + WhatsApp blast to existing Delhi users + paid Meta/Google retargeting if budget permits).
5. Decision Agent KPI scrape `delhi_mau` should ramp to 1000 within 60-90 days of supply activation.

## KPI query (Supabase)

```sql
SELECT COUNT(DISTINCT u.id) AS delhi_mau
FROM "User" u
JOIN "UserSession" s ON s.user_id = u.id
WHERE (u.city ILIKE '%delhi%' OR u.city ILIKE '%new delhi%')
  AND s.created_at >= NOW() - INTERVAL '30 days';
```

Wired in `docs/roadmap/items/Q2/geo/003-delhi-soft-launch-25-pandits-5-temples-1k-mau.md` frontmatter (`kpi.query`).

## Dependencies

- **R-Q2-S-003** — Delhi 25 pandit onboarding pipeline. Founder coordinates same KYC funnel.
- **R-Q2-S-006** — Delhi 5 temple verified onboarding (Akshardham + Birla anchor).

## Risks + tripwires

- Pandit KYC drop-off: target ≥60% conversion KYC-invite → verified. If <40% after 2 weeks, revise screening criteria.
- Temple MoU stall: Akshardham + Birla are large institutions; expect 4-8 week legal review cycles. Founder maintains warm intro discipline; no cold spam to private temple admin emails.
- MAU growth without supply: if `/city/delhi` traffic ramps but bookings flat, demand-side conversion gap → fix copy + add Hindi-script CTA + reduce form friction before paid acquisition.
- DO NOT auto-publish multilingual landing variants for Delhi (Hindi/Punjabi) without native review per repo doctrine.

## Verification (post-deploy)

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://darshya.online/city/delhi   # expect 200
curl -s https://darshya.online/city/delhi | grep -c "Akshardham"             # expect ≥1
curl -s https://darshya.online/city/delhi | grep -c "Kalkaji"                # expect ≥1 (new entry)
```

## Status flip checklist

Mark `shipped_at` + flip `status: shipped` ONLY when ALL of:

- [ ] 25 verified pandits in Delhi (`Priest.aadhaar_verified=true`) — founder-confirmed
- [ ] 5 verified temples in Delhi (`Temple.verified=true`) — founder-confirmed
- [ ] Supabase KPI query returns `delhi_mau >= 1000`
- [ ] PostHog `/city/delhi` 7-day rolling sessions ≥ 200 (cohort gate)
- [ ] Sales pipeline tracker shows ≥3 leads/week from /city/delhi cohort

Until then: `status: in_progress`. Engineering deliverable in this batch is the scaffold + this handoff doc.
