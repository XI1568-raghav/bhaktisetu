# R-Q1-G-002 — Varanasi city-2 launch (handoff)

> Status: city page expanded to 10 temples + 12 puja SKUs; supply onboarding (50 pandits + 10 verified temples) gated on founder Varanasi trip + Pandit Sabha outreach. Engineering scaffold complete; live KPI = 1 requires manual action.

## Success criteria

| # | Criterion | Status | Owner |
|---|---|---|---|
| 1 | ≥50 verified pandits in Varanasi (Priest table, city='Varanasi', aadhaar_verified=true) | ⏳ | Founder (1-week Varanasi trip + Pandit Sabha outreach) |
| 2 | ≥10 verified temples in Varanasi (Temple table, city='Varanasi', verified=true) | ⏳ | Founder + ops (verify partnership MoU on Vishwanath corridor + Dashashwamedh ghat sweep) |
| 3 | ≥10 paid bookings completed via Varanasi pandits in last 30d | ⏳ | NRI gift-puja activation (post supply ready) |
| 4 | /city/varanasi page live with temple + puja inventory | ✓ shipped | This batch |

## What shipped this batch

- `apps/web/lib/cities.ts` — Varanasi entry: `famousTemples` 4→10 (added Annapurna Devi, Bharat Mata, New Vishwanath BHU, Vishalakshi Shakti Peeth, Kaal Bhairav, Mrityunjaya Mahadev), `popularPujas` 3→12 (added navgraha, satyanarayan, pitra-paksha-shraddh, kaal-sarp-dosh-nivaran, griha-pravesh, annapurna, ganga-aarti-sankalp, mundan, antim-sanskar), `popularDeities` 3→4 (+krishna), `nearbyYatra` +kashi-prayag-gaya. Expanded `description` (Kashi/Banaras/Avimukta naming + 88 ghats), and `significance` (Manikarnika 3000-yr Agni + Sampurnanand Sanskrit University + BHU + Pathshala density + NRI canonical lane).
- Page auto-rerenders via `/city/[slug]` SSG (revalidate=3600). No new route file.
- Criterion #4 ✅ met by re-build.

## Sales/onboarding tactics (per agent_brief)

1. **Founder physical recce (Q1 month 2)** — 1-week Varanasi trip:
   - Vishwanath corridor walk-through (post-2021 redevelopment, 50K daily footfall).
   - Dashashwamedh ghat: meet head Pandit of Ganga Aarti committee (Ganga Sewa Nidhi trust).
   - Manikarnika cremation rites Pandit sub-community.
   - Sampurnanand Sanskrit University guest lecture → Vedic Pathshala student outreach.
2. **Pandit Sabha outreach (organized)** — Kashi Vidvat Parishad (the most senior council). Founder needs warm intro via BHU faculty.
3. **Hostel/dharamshala temple priest enrollment** — Birla Dharamshala / Andhra Ashram / Gujarati Lodge in-house priests = stable supply, willing to take WhatsApp-bookable extra income.
4. **Cold WhatsApp** — top-100 Varanasi pandits scraped from Google Maps "purohit Varanasi" + JustDial.

Each verified pandit MUST have `aadhaar_verified=true` per business rule #4.

## Founder action (BLOCKING)

1. Block 1-week calendar Q1 month 2 for Varanasi trip.
2. Pre-trip: warm intros via BHU Dharma Vigyan faculty (target 5-10 contacts).
3. On-site: KYC video calls with first 10 pandits, Aadhaar verification (manual cross-check via official Aadhaar e-KYC portal — Darshya does NOT auto-verify).
4. On-site: temple onboarding MoU (10 temples — focus on Vishwanath corridor + ghat-side + BHU-area + Sankat Mochan, Durga Kund, Tulsi Manas). verified=true flip in `/admin` only after MoU signed.
5. Post-trip: continue funnel via Pandit Sabha intros (target 40 more pandits over Q1-Q2 to reach 50).
6. After both gates: Decision Agent KPI scrape `city_active_varanasi` should flip to 1.

## Why Varanasi second city (strategic rationale)

- **Highest devotional density in India.** Kashi Vishwanath = canonical Jyotirlinga. Brand halo > any other Indian city for "send puja to" semantics.
- **NRI revenue lever.** "Send puja to Kashi" = the canonical NRI gift-puja lane. 9-10× domestic pricing applies cleanly. Diaspora emotional anchor: most North-Indian-origin NRIs trace ancestral karm-kand obligations (pitra-paksha shraddh, asthi visarjan) to Banaras-Prayag-Gaya circuit.
- **Supply density.** Per-capita Vedic scholar count highest in India. 50-pandit target achievable in 1-week founder trip if Pandit Sabha + BHU intros land.
- **Trustless trust.** Video proof at Manikarnika / Dashashwamedh = instant believability vs WhatsApp screenshot competitors.

## Dependencies

- Depends on R-Q1-S-001 (50 Varanasi pandits onboarding pipeline) — coordinated same KYC funnel.
- Depends on R-Q1-S-004 (10 Varanasi temples partnership) — coordinated same MoU drive.

## KPI query (Supabase)

```sql
SELECT CASE
  WHEN (SELECT COUNT(*) FROM "Priest" WHERE city='Varanasi' AND aadhaar_verified=true) >= 50
   AND (SELECT COUNT(*) FROM "Temple" WHERE city='Varanasi' AND verified=true) >= 10
  THEN 1 ELSE 0 END;
```

Wired in `docs/roadmap/items/Q1/geo/002-open-varanasi-market-10-temples-50-pandits-second-.md` frontmatter (kpi.query).
