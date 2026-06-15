# R-Q1-G-006 — Pune supply onboarding (6th city) (handoff)

> Status: Marathi-language Pune landing + cities.ts anchor temples shipped (scaffold). Pandit onboarding (3 verified min, 15 stretch) + temple verification (1 partner min, 6 anchor targets) = founder-action-required. Engineering surface complete; live KPI = 0 until founder unblocks supply via cold-calls + KYC.

## KPI

- Metric: `city_active_pune`
- Target: 1 (binary — flips to 1 if `count(priest where city='Pune' and aadhaar_verified=true and active=true) >= 3`)
- Current: 0
- Source: Supabase — `SELECT CASE WHEN COUNT(*) >= 3 THEN 1 ELSE 0 END AS city_active_pune FROM priests WHERE city = 'Pune' AND aadhaar_verified = true AND active = true;`

## Success criteria

| # | Criterion | Status | Owner |
|---|---|---|---|
| 1 | 3 verified pandits onboarded in Pune by Mar 31 2026 | ⏳ | Founder (KYC video calls + Aadhaar verify) |
| 2 | 1 Pune temple partner signed | ⏳ | Founder + ops (MoU + temple-portal verified=true flip) |
| 3 | 5+ pujas listed at Pune temples in pujas table with city=Pune | ⏳ | Ops post temple signing (puja catalog import) |
| 4 | Marathi UI surface w/ Pune-local CTAs + anchor temples + pandit roster | ✓ shipped | This batch |

## What shipped this batch

- `apps/web/app/mr/pune/page.tsx` — NEW Marathi-language Pune landing.
  - 6 anchor-temple cards (Dagdusheth Halwai, Kasba Ganpati, Parvati, Chaturshringi, Chinchwad Morya Gosavi, Shreemant Bhausaheb Rangari Ganpati) in Marathi w/ area + deity + highlight.
  - 15-pandit stretch roster table split across 4 zones (Old Pune 4 / Deccan-FC-Shivajinagar 4 / Pimpri-Chinchwad 4 / Hadapsar-Kharadi-Viman Nagar IT 3) — all `recruiting` until founder KYC. Ship-gate is 3 minimum.
  - Pune-localized CTAs (`/pujas?city=pune`, `/darshan?city=pune`).
  - NRI Marathi section (US/UK/AU/SG diaspora) — annual subscription ₹5000/$60.
  - `LocalBusiness` schema.org JSON-LD (areaServed: Pune, inLanguage: mr+en).
  - Edge runtime, revalidate 86400.
  - hreflang alternates → `/city/pune` English canonical.
- `apps/web/lib/cities.ts` — Pune entry expanded: `famousTemples` 4→6 (added Chinchwad Morya Gosavi + Chaturshringi to existing Dagdusheth + Parvati + Chaturshringi + Bhausaheb Rangari), no schema change needed (cities.ts already had Pune entry from prior batch).
- `apps/web/app/sitemap.ts` — `/mr/pune` priority 0.85 entry added.

## Sales/onboarding tactics (per agent_brief)

1. **Cold-call outreach top 20** — Kasba Peth + Budhwar Peth + Chinchwad temple cluster pandits. Founder makes calls; sub-agent logs results to `docs/agent-reports/pune-outreach.md` (file to be created on first outreach cycle).
2. **Sakal + Maharashtra Times warm intros** — Marathi-language press for credibility; ask for pandit-vendor list.
3. **Ganesh Mandal organic outreach** — Pune has 4000+ public Ganesh mandals (sarvajanik). Mandal trustees know senior pandits — warm referrals.
4. **Tilak Smarak Mandir + Bhandarkar Oriental Research Institute** — institutional warm contacts for Vedic-scholar pandits.
5. **Iyengar + Deshastha + Konkanastha Brahmin communities** — caste-specific WhatsApp/FB groups for tradition-aligned pandits.

Each verified pandit MUST have `aadhaar_verified=true` per business rule #4 (priest payout gated).

## Founder action (BLOCKING)

1. **Cold calls top 20** — Kasba Ganpati + Dagdusheth Halwai + Chinchwad area. Script ready in agent_brief; founder makes calls personally (first 25 hires, no SDR yet). Aim for 5 callbacks → 3 KYC → 3 verified.
2. **KYC video calls** — Aadhaar + bank account + Vedic shastra qualification verify per pandit.
3. **Aadhaar verification (manual)** — cross-check via official Aadhaar e-KYC portal — Darshya does NOT auto-verify.
4. **Temple onboarding MoU** — at least 1 anchor temple (Dagdusheth or Chinchwad most likely fast). Verified=true flip in `/admin/temples` only after MoU signed.
5. **Pune-local launch event** — once 3 pandits + 1 temple live, host a small launch at Kasba Ganpati area; invite founding-100 devotees.
6. **Decision Agent KPI scrape `city_active_pune`** flips to 1 after 3rd pandit `aadhaar_verified=true` lands in DB.

## Dependencies (HARD BLOCK)

- None upstream (P2 item, parallelizable with R-Q1-S-002 onboarding work).
- Downstream: R-Q2-G-* Pune scale items will depend on this 3-pandit/1-temple floor being hit.

This item stays `in_progress` until 3 verified pandits + 1 temple flip live. Engineering surface is ready to receive traffic; cannot drive marketing spend until supply ready.

## KPI query (Supabase)

```sql
-- Decision Agent scrape (manual, R-Q1-G-006)
SELECT
  CASE WHEN COUNT(*) >= 3 THEN 1 ELSE 0 END AS city_active_pune,
  COUNT(*) AS verified_pandit_count
FROM priests
WHERE city = 'Pune'
  AND aadhaar_verified = true
  AND active = true;
-- target: city_active_pune = 1 (>= 3 verified pandits)
```

## Verify (post-deploy)

1. `curl -s -o /dev/null -w "%{http_code}" https://darshya.online/mr/pune` — expect 200
2. `curl -s https://darshya.online/mr/pune | grep -c "दगडूशेठ"` — expect ≥1 (Marathi anchor temple name)
3. `curl -s https://darshya.online/mr/pune | grep -c "मोरया गोसावी"` — expect ≥1
4. `curl -s https://darshya.online/city/pune | grep -c "Dagdusheth Halwai Ganpati"` — expect ≥1 (English cities.ts retained)
5. `curl -s https://darshya.online/sitemap.xml | grep -c "/mr/pune"` — expect ≥1
