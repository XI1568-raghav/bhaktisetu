# R-Q1-G-004 — Tirupati supply onboarding (4th city candidate, handoff)

> Status: city page expanded to 10 temples + 12 puja SKUs covering TTD-sanctioned + Sri Kalahasti + Kanipakam supply lanes. Supply onboarding (Aadhaar-verified pandits + temple MoUs) gated on founder Tirupati trip + TTD agama-pathshala outreach. Engineering scaffold complete; live KPI = 1 requires manual action. Status remains `in_progress`.

## Success criteria

| # | Criterion | Status | Owner |
|---|---|---|---|
| 1 | ≥25 verified Tirupati-area pandits (Priest table, city='Tirupati', aadhaar_verified=true) — split across Tiruchanur archaka families + downtown Vaikhanasa/Pancharatra agama pathshalas + Sri Kalahasti Shaiva archakas + Kanipakam Vinayaka archakas | ⏳ | Founder (1-week recce + agama-pathshala intros) |
| 2 | ≥6 verified Tirupati-area temples (Temple table, city='Tirupati', verified=true) — NOT including TTD-administered Tirumala hill shrines (handled via TTD partnership, not Darshya direct MoU) | ⏳ | Founder + ops (MoU with non-TTD shrines + Sri Kalahasti + Kanipakam) |
| 3 | ≥10 paid bookings completed via Tirupati pandits in last 30d (sankalp / mundan / kalyanotsavam-sankalp / Rahu-Ketu pariharam lanes) | ⏳ | NRI gift-puja activation (post supply ready) — Telugu+Tamil diaspora is primary lane |
| 4 | /city/tirupati page live with temple + puja inventory + significance reflecting TTD scale + sankalp constraints | ✓ shipped | This batch |

## What shipped this batch (engineering)

- `apps/web/lib/cities.ts` — Tirupati entry expanded:
  - `description` 1 sentence → 4 sentences: Tirumala/Tirupathi/Balaji Dham naming, ~75M annual pilgrims, 60–80K daily darshan tokens, Hundi ~₹1,500 Cr/year, mundan + Kalyanotsavam canonical lanes, anchor temple footprint across Tirumala + Tiruchanur + downtown + Sapta Giri.
  - `famousTemples` 3 → 10: Tirumala Venkateswara, Padmavathi Devi (Tiruchanur), Govindaraja Swamy, Kapila Theertham (Shaiva), Sri Kalahasti (Vayu Linga, 36 km), Kanipakam Vinayaka (68 km), Srinivasa Mangapuram (Kalyana Venkateswara), ISKCON Tirupati, Alipiri Padala Mandapam, Sri Varahaswamy.
  - `popularDeities` 2 → 4 (added shiva, ganesha for Kalahasti + Kanipakam).
  - `popularPujas` 2 → 12: added mundan, kalyanotsavam-sankalp, srinivasa-kalyanam, sahasra-deepalankarana-sankalp, navgraha-puja, griha-pravesh, rudrabhishek, annaprasana, ayushya-homam-sankalp, gold-tulabharam-sankalp. (Sankalp = vow performed at agama pathshala on devotee's behalf; the actual seva at Tirumala hill remains TTD-exclusive — this is the legally-safe model. See "Supply caveat" below.)
  - `nearbyYatra` 1 → 3 (added sri-kalahasti, kanchipuram).
  - `significance` 1 sentence → 1 long paragraph: TTD scale (₹4,400 Cr/year, 16K staff, 1L+ daily annadanam meals), in-house archaka model (~600 Vaikhanasa+Pancharatra agama priests = NOT available for external onboarding), Darshya supply focus lanes (sankalp at downtown agama pathshalas + Tiruchanur + Sri Kalahasti + Kanipakam), brahmotsavams calendar, NRI 9–10× pricing rationale, air + rail access.
- Page auto-rerenders via `/city/[slug]` SSG (revalidate=3600). No new route file.
- Criterion #4 ✅ met by re-build.

## Sales / onboarding tactics (per agent_brief; founder-driven)

1. **Founder physical recce (Q1 month 3)** — 1-week Tirupati + Sri Kalahasti + Kanipakam trip:
   - Day 1–2: Tirumala darshan + Bhumi Puja agama pathshala visits in downtown Tirupati (Tirumala Tirupati Devasthanams Sri Venkateswara Vedic University outreach via Dean's office).
   - Day 3: Tiruchanur Padmavathi temple — meet head archaka families (Vaikhanasa lineage). Identify 5–10 candidate pandit households willing to offer sankalp services + WhatsApp-confirmable seva.
   - Day 4: Sri Kalahasti (36 km) — meet Rahu-Ketu Pariharam ritual pandits (this is the canonical Rahu-Ketu dosh nivaran destination in India, especially for South-Indian astrology consumers; high NRI repeat-booking lane).
   - Day 5: Kanipakam (68 km) — Vinayaka temple, meet Sankashti / Vinayaka Chaturthi sankalp archakas.
   - Day 6–7: Buffer for Andhra Pradesh state Devasthanam Endowments Dept introduction (state govt body that licenses non-TTD agama pathshalas).
2. **TTD partnership track (separate from supply)** — formal MoU with TTD for proxy-darshan video feed + e-hundi + e-prasadam delivery is a long-cycle legal track (12–18 months; previous attempts by other platforms have stalled at Trust Board level). DO NOT block engineering on this — proceed with sankalp-pathshala supply model for Q1, escalate TTD MoU to Q3–Q4 with legal counsel.
3. **NRI diaspora outreach (parallel)** — Telugu Association of North America (TANA), American Telugu Association (ATA), UK Telugu Association, Sydney Telugu Association — sponsor Brahmotsavam livestream + Vaikunta Ekadashi sankalp campaigns. Per-event email blast volume cap 100/day on Resend free tier — schedule across 7 days.
4. **Cold WhatsApp** — top-50 Tirupati-area pandits scraped from JustDial "purohit Tirupati" + Sulekha "pandit Tiruchanur" + Google Maps "agama pathshala Tirupati". Anti-spam: 2 messages/day max, 24h cooldown per number.

Each verified pandit MUST have `aadhaar_verified=true` per business rule #4 (priest payout gate).

## Supply caveat — TTD exclusive rights on Tirumala hill (LEGAL)

- TTD's ~600 in-house archakas (Vaikhanasa Agama + Pancharatra Agama traditions) perform ALL rituals on Tirumala hill (Venkateswara sanctum, Vimana Venkateswara, etc). External pandit onboarding for hill-top seva is NOT legally feasible.
- Darshya's Tirupati supply model = **sankalp performed off-hill on devotee's behalf** + proxy-darshan video from inside TTD-allowed devotee zones + dispatch of TTD prasadam (via TTD e-prasadam API, when partnership lands).
- Sankalp = a Vedic vow recited by qualified archaka at agama pathshala downtown / Tiruchanur / Kapila Theertham (Shaiva). Devotee names + gotra + nakshatra are recited; the merit (punya) is attributed to the devotee. This is the standard pattern used by every legitimate NRI puja booking platform for TTD-restricted seva.
- Marketing copy MUST be honest about this distinction. Do NOT use phrases like "puja performed at Tirumala on your behalf" — this triggers TTD legal notices (precedent: 2024 cease-and-desist sent to multiple platforms). Correct phrasing: "Sankalp-vow recited in your name at TTD-recognized agama pathshala Tirupati."

## Founder action (BLOCKING)

1. Block 1-week calendar Q1 month 3 for Tirupati + Sri Kalahasti + Kanipakam trip (10–12 days end-to-end including travel buffers).
2. Pre-trip: warm intros via TTD Sri Venkateswara Vedic University Dean's office + Andhra Pradesh Endowments Dept (target 5–10 contacts).
3. Pre-trip legal review: marketing copy for Tirupati city page + future Tirupati-specific puja landing pages — get a Bangalore IP lawyer to sign off on "sankalp" framing vs "puja at Tirumala". Budget ~₹15K one-time.
4. On-site: KYC video calls with first 10 archaka family heads (5 sankalp pandits in downtown / Tiruchanur, 3 Sri Kalahasti Shaiva, 2 Kanipakam Vinayaka). Aadhaar verification (manual cross-check via official Aadhaar e-KYC portal — Darshya does NOT auto-verify).
5. On-site: temple onboarding MoU (6 temples — focus on non-TTD shrines: Kapila Theertham, Govindaraja Swamy townside, Srinivasa Mangapuram, Sri Kalahasti, Kanipakam Vinayaka, ISKCON Tirupati). verified=true flip in `/admin` only after MoU signed + counsel review.
6. Post-trip: continue funnel via Vedic University faculty intros (target 15 more pandits over Q1–Q2 to reach 25).
7. After both gates: Decision Agent KPI scrape `city_active_tirupati` should flip to 1.

## Why Tirupati fourth city (strategic rationale)

- **Highest single-temple revenue in India + globally.** TTD ~₹4,400 Cr/year operating + ~₹1,500 Cr/year Hundi. Brand halo for "Balaji vow" semantics > Sri Mandir's Puri positioning.
- **NRI revenue lever — Telugu+Tamil diaspora.** 4M+ Telugu+Tamil-origin diaspora globally (US #1, then UK / Canada / Australia / Singapore / Gulf). Trip-to-Tirumala is a near-universal family vow obligation; remote sankalp is the only viable substitute when travel is impossible. 9–10× domestic pricing applies cleanly.
- **Supply density (with constraints).** Tirupati has the densest agama-pathshala ecosystem in South India outside Kanchi-Sringeri. 25-pandit target achievable in 1-week founder trip IF Vedic University intros + Endowments Dept intros land.
- **Lane-specific NRI demand spikes** — Sri Kalahasti Rahu-Ketu pariharam is a category-defining lane (high-ticket sankalp ₹5K–₹50K, repeated 1–3× per year per devotee for ~7 years of Rahu mahadasha; NRI 9× = ₹45K–₹4.5L per booking). This single lane could be 20% of city revenue.
- **Trustless trust.** Video proof of sankalp recital + TTD prasadam dispatch tracking + Aadhaar-verified archaka credentials = clear differentiation vs WhatsApp screenshot competitors.
- **Risk note.** Tirumala-hill seva legal restriction means Darshya cannot claim parity with TTD's own e-seva booking system; positioning must be "premium NRI sankalp + Sri Kalahasti + Kanipakam + Sapta Giri circuit" rather than "TTD darshan booking". This is a feature not a bug — anti-positioning vs TTD avoids legal conflict.

## Dependencies

- Depends on R-Q1-S-001 / R-Q1-S-004 supply funnel templates (KYC + MoU workflows reused).
- Not blocking: TTD formal MoU (Q3–Q4 escalation path).
- Coordinates with: future R-Q3-M-* NRI brahmotsavam-livestream marketing items.

## KPI query (Supabase)

```sql
SELECT CASE
  WHEN (SELECT COUNT(*) FROM "Priest" WHERE city='Tirupati' AND aadhaar_verified=true) >= 25
   AND (SELECT COUNT(*) FROM "Temple" WHERE city='Tirupati' AND verified=true) >= 6
  THEN 1 ELSE 0 END;
```

Wire in `docs/roadmap/items/Q1/geo/004-tirupati-supply-onboarding-4th-city-candidate.md` `kpi.query` field (currently TBD-populate-before-orchestrator-go-live; founder can paste this query when prod KPI scrape goes live).
