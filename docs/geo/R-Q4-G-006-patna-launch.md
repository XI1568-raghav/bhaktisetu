# R-Q4-G-006 — Patna city-11 launch (east zone, handoff)

> Status: city page scaffold shipped (`/city/patna` auto-rendered via SSG); supply onboarding (25 pandits + 5 verified temples) gated on founder Patna trip + Mahavir Mandir trust outreach + Sikh-Hindu temple MoUs. Engineering scaffold complete; live KPI = 1 requires manual action.

## Success criteria

| # | Criterion | Status | Owner |
|---|---|---|---|
| 1 | ≥25 verified pandits in Patna (Priest table, city='Patna', aadhaar_verified=true) | ⏳ | Founder (1-week Patna trip + Mahavir Mandir trust intro + Pataliputra Brahmin Sabha outreach) |
| 2 | ≥5 verified temples in Patna (Temple table, city='Patna', verified=true) | ⏳ | Founder + ops (Mahavir Mandir / Patan Devi / Hanuman Mandir Patna Junction MoUs) |
| 3 | ≥10 paid bookings completed via Patna pandits in last 30d | ⏳ | NRI gift-puja activation (post supply ready) |
| 4 | /city/patna page live with temple + puja inventory | ✓ shipped | This batch |

## What shipped this batch

- `apps/web/lib/cities.ts` — NEW Patna entry:
  - `famousTemples` × 6: Mahavir Mandir, Bari Patan Devi (Shakti Peetha), Choti Patan Devi, Hanuman Mandir Patna Junction, Takht Sri Patna Sahib (Sikh), Agam Kuan + Sheetala Mata
  - `popularDeities` × 3: hanuman, devi, shiva
  - `popularPujas` × 5: sunderkand-path, satyanarayan-puja, navgraha-puja, pitra-paksha-shraddh, mundan
  - `nearbyYatra` × 4: gaya, bodhgaya, rajgir-nalanda, vaishali (eastern circuit)
  - `isNriMagnet: true` — Bihari diaspora (Mauritius / Trinidad / Guyana / Surinam / Fiji / South Africa girmitiya descendants + Gulf/US/UK current-gen) trace ancestral pitru-paksha + Chhath roots to Bihar.
  - `description` + `significance` capture Pataliputra heritage, Mahavir Mandir laddu GI tag, Patan Devi Shakti Peetha lineage, pitru-paksha gateway airport role.
- Page auto-rerenders via `/city/[slug]` SSG (revalidate=3600). No new route file. Sitemap auto-fans via `citySlugs()`.
- Criterion #4 ✅ met by re-build.

## Sales/onboarding tactics (per agent_brief)

1. **Founder physical recce (Q4 month 11)** — 1-week Patna trip:
   - **Mahavir Mandir Trust (Mahavir Mandir, Patna Junction)** — meet Acharya Kishore Kunal's successor or trust office. India's #2-income temple after Tirupati. Single warm intro here = unlocks 25+ associated pandits + GI-tag laddu prasad supply chain for /store.
   - **Bari Patan Devi + Choti Patan Devi** — Shakti Peetha mahants. Coordinate Navratri ritual MoU.
   - **Hanuman Mandir Patna Junction** — daily Sunderkand path congregation. Volunteer pandit pool.
   - **Pataliputra Sanskrit Sansthan + Bihar Sanskrit Shiksha Board** — Vedic Pathshala student outreach (NET-qualified karm-kand purohits).
2. **Pataliputra Brahmin Sabha outreach (organized)** — Bihar's senior Maithil/Bhumihar/Kanyakubja Brahmin councils. Founder needs warm intro via Mahavir Mandir trust or Patna Sahib gurudwara MLAs (Sikh-Hindu Patna interfaith stable since 1666).
3. **Chhath Puja vendor enrollment (Oct-Nov annual)** — Bihar's signature festival. 5L+ ghat-side ritual specialists active Oct-Nov; offer Darshya video-proof booking lane.
4. **Gaya pitru-paksha overlap (Sep-Oct)** — Patna airport is the gateway. Pandits often dual-list Patna + Gaya. Co-recruit with R-Q1-G-? Gaya item.
5. **Cold WhatsApp** — top-100 Patna pandits scraped from Google Maps "purohit Patna" + JustDial + Mahavir Mandir directory.

Each verified pandit MUST have `aadhaar_verified=true` per business rule #4.

## Founder action (BLOCKING)

1. Block 1-week calendar Q4 month 11 for Patna trip.
2. Pre-trip: warm intros via Mahavir Mandir Trust office + (optional) Patna Sahib gurudwara secretary (for cross-faith referrals + Bihar political access).
3. On-site: KYC video calls with first 10 pandits, Aadhaar verification (manual cross-check via official Aadhaar e-KYC portal — Darshya does NOT auto-verify).
4. On-site: temple onboarding MoU (5 temples — focus on Mahavir Mandir, Bari Patan Devi, Choti Patan Devi, Hanuman Mandir Patna Junction, Takht Sri Patna Sahib if interfaith path chosen). verified=true flip in `/admin` only after MoU signed.
5. Post-trip: continue funnel via Pataliputra Brahmin Sabha intros (target 15 more pandits over Q4 to reach 25).
6. After both gates: Decision Agent KPI scrape `city_active_users_patna` should flip toward 3000 target via Chhath (Oct-Nov) + pitru-paksha (Sep-Oct) NRI gift-puja wave.

## Why Patna 11th city (strategic rationale)

- **East-zone density gap.** Q4 east-zone plan (Kolkata Q4-G-001 + Patna Q4-G-006 + Bhubaneswar TBD + Guwahati TBD) — Patna anchors Bihar + Jharkhand cluster (170M+ population). Currently east zone underserved vs north (Delhi/Varanasi/Ayodhya) + south (Tirupati/Madurai/Guruvayur).
- **NRI lever via Bihari diaspora.** Girmitiya descendants (Mauritius 27% Bihari-origin, Trinidad 35%, Guyana 40%, Surinam 27%, Fiji 38%) + current Gulf/US/UK Bihari professionals. "Send puja to Patna" + "Chhath puja livestream from Patna ghat" = canonical NRI gift-puja lanes.
- **Mahavir Mandir trust intro = supply unlock.** Single relationship = 25+ pandits + laddu prasad GI-tag supply. Highest-leverage onboarding in any tier-2 Indian city.
- **Chhath puja moat.** Bihar's signature Sun + Chhathi Maiya festival. Sri Mandir/Utsav weak on Chhath-specific ritual SKUs. Patna onboarding + Chhath video-proof = defensible Q4 NRI revenue ramp.
- **Gateway role.** Patna airport = pitru-paksha pilgrim arrival hub for Gaya. Co-list pandits, cross-sell yatra packages.

## Dependencies

- Depends on R-Q4-S-002 (eastern-zone pandit pipeline) — coordinated same KYC funnel.
- Coordinates with east-zone temple partnership drives (Q4 supply track).
- Adjacent to (future) R-Q?-G-? Gaya city expansion (shared pandit pool, shared pitru-paksha SKUs).

## KPI query (Supabase)

Original spec KPI metric is `city_active_users_patna` (target 3000 PostHog users). Replace existing TBD with this query in roadmap frontmatter when wiring the city-onboarding-state Supabase view (per Phase 2 KPI scraper pattern).

```sql
-- Supply readiness gate (0/1) — required before user-acquisition KPI can climb
SELECT CASE
  WHEN (SELECT COUNT(*) FROM "Priest" WHERE city='Patna' AND aadhaar_verified=true) >= 25
   AND (SELECT COUNT(*) FROM "Temple" WHERE city='Patna' AND verified=true) >= 5
  THEN 1 ELSE 0 END AS patna_supply_ready;
```

PostHog query (user-side KPI) goes via existing `_kpi-posthog.mjs` once PostHog insight ID for `city_active_users_patna` is created (TBD per agent_brief).

## Deviations from spec

- Spec body was placeholder ("TBD — populated by first sub-agent cycle"). This handoff shipped the scaffold (cities.ts entry + /city/patna route via SSG fan-out) and documented the founder action gate per "DO NOT auto-claim shipped status on items where the KPI requires founder action" pitfall.
- Status remains `in_progress` — KPI target 3000 active users gated on supply readiness (founder trip) + NRI marketing post-Q4 Chhath/pitru-paksha activation.
- KPI query was `TBD-populate-before-orchestrator-go-live` in spec; supply-readiness companion query provided above for the first ARE Decision Agent cycle to wire into Phase 2 KPI scraper.
