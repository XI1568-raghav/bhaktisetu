# R-Q1-G-004 — Tirupati supply onboarding (4th city candidate) (handoff)

> Status: Engineering scaffold (Telugu Tirupati landing + cities.ts entry expanded with anchor temples + sitemap fan-out) shipped. Pandit onboarding (3 verified min, 12 stretch) + temple verification (1 partner min — TTD or anchor temple) = founder-action-required. KPI = 0 until founder unblocks supply.

## KPI

- Metric: `city_active_tirupati`
- Target: 1 (binary — flips to 1 if `count(priest where city='Tirupati' and aadhaar_verified=true and active=true) >= 3`)
- Current: 0
- Source: Supabase — see KPI query at end.

## Success criteria

| # | Criterion | Status | Owner |
|---|---|---|---|
| 1 | 3 verified pandits onboarded in Tirupati by Mar 31 2026 | ⏳ | Founder (KYC video calls + Aadhaar verify) |
| 2 | 1 anchor temple partner signed (TTD partnership ideal; backup: smaller anchor temple) | ⏳ | Founder + ops (MoU + temple-portal verified=true flip) |
| 3 | 5+ pujas listed at Tirupati temples in pujas table with city=Tirupati | ⏳ | Ops post temple signing (puja catalog import — Suprabhata Seva, Tomala Seva, Archana, Kalyanotsavam, Brahmotsavam) |
| 4 | Telugu UI surface w/ Tirupati-local CTAs + anchor temples + pandit roster scaffold | ✓ shipped | This batch |

## What shipped this batch

- `apps/web/app/te/tirupati/page.tsx` — NEW Telugu-language Tirupati landing.
  - 6 anchor-temple cards (Sri Venkateswara Swamy Vaari Devasthanam / Tirumala, Sri Padmavathi Ammavari Temple / Tiruchanur, Sri Govindaraja Swamy Temple, Sri Kapileswara Swamy Temple, Sri Kodandarama Swamy Temple, ISKCON Tirupati) in Telugu w/ area + deity + highlight.
  - 12-pandit stretch roster scaffold split across zones (Tirumala Hills / Tiruchanur / Tirupati Town / Chandragiri-Srikalahasti corridor) — all `recruiting` until founder KYC. Ship-gate is 3 minimum.
  - Tirupati-localized CTAs (`/pujas?city=tirupati`, `/darshan?city=tirupati`).
  - NRI Telugu section (US/UK/AU/SG/Middle East Telugu diaspora) — annual subscription target ₹5000/$60.
  - `LocalBusiness` schema.org JSON-LD (areaServed: Tirupati, inLanguage: te+en).
  - Edge runtime, revalidate 86400.
  - hreflang alternates → `/city/tirupati` English canonical.
- `apps/web/app/sitemap.ts` — `/te/tirupati` priority 0.85 entry intent (founder to verify on next deploy).
- `docs/geo/R-Q1-G-004-tirupati-supply-onboarding-handoff.md` — this handoff doc (sales tactics + KPI query + verify cheatsheet).

## Sales/onboarding tactics (founder action checklist)

1. **TTD (Tirumala Tirupati Devasthanams) partnership outreach** — TTD is Asia's wealthiest temple board (~₹14,000 Cr+ assets). Approach via TTD JEO (Joint Executive Officer) office; pitch online-darshan/seva-booking partnership. Even a tier-2 anchor (Tiruchanur Padmavathi or Govindaraja Swamy) gives credibility before TTD.
2. **Tirumala arjitha seva pandit network** — TTD employs ~700+ Vedic pandits across Tirumala. Many supplement income via private kalyanotsavam/archana for visiting devotees. Cold-call via TTD Vaikhanasa scholar referrals.
3. **Sri Venkateswara Vedic University (Tirupati)** — institutional warm contact for shastra-qualified Vaikhanasa + Pancharatra pandits.
4. **Padmavathi Mahila Visvavidyalayam + S.V. University Sanskrit dept** — academic warm intros for scholar-pandits.
5. **Telugu language press (Eenadu, Sakshi, Andhra Jyothi)** — Telugu credibility for pandit + devotee acquisition.
6. **NRI Telugu communities (TANA, ATA, NATA conferences)** — diaspora subscription pre-sales (Brahmotsavam virtual darshan, annual Suprabhata Seva subscription).

Each verified pandit MUST have `aadhaar_verified=true` per business rule #4 (priest payout gated on Aadhaar).

## Founder action (BLOCKING)

1. **TTD outreach letter** — formal partnership pitch (founder personally drafts; ideally warm-intro via TTD JEO contact). If TTD MoU not feasible in Q1, pivot to Tiruchanur Padmavathi Temple or Sri Kapileswara as anchor.
2. **Cold calls top 15 pandits** — TTD-affiliated + Tirumala arjitha-seva network. Script ready in agent_brief (TBD on next agent cycle); founder makes calls personally (first 25 hires, no SDR yet). Aim for 5 callbacks → 3 KYC → 3 verified.
3. **KYC video calls** — Aadhaar + bank account + Vedic shastra qualification (Vaikhanasa / Pancharatra tradition for Tirupati corridor) verify per pandit.
4. **Aadhaar verification (manual)** — cross-check via official Aadhaar e-KYC portal — Darshya does NOT auto-verify.
5. **Temple onboarding MoU** — at least 1 anchor temple. Verified=true flip in `/admin/temples` only after MoU signed.
6. **Tirupati-local launch event** — once 3 pandits + 1 temple live, host a small launch at Tirupati town; invite founding-50 Telugu-speaking devotees.
7. **Decision Agent KPI scrape `city_active_tirupati`** flips to 1 after 3rd pandit `aadhaar_verified=true` lands in DB.

## Dependencies (HARD BLOCK)

- None upstream (P1 item per original priority; demoted to P2 in current ordering due to TTD partnership lead time, parallelizable with R-Q1-S-* onboarding work).
- Downstream: R-Q2-G-* Tirupati scale items will depend on this 3-pandit/1-temple floor being hit.
- TTD partnership is HIGH-VALUE but HIGH-LEAD-TIME (3-6 months typical for institutional MoU). Recommend dual-track: TTD outreach in parallel with smaller anchor temple as fallback to flip KPI faster.

This item stays `in_progress` until 3 verified pandits + 1 temple flip live. Engineering surface ready to receive traffic; cannot drive marketing spend until supply ready.

## KPI query (Supabase)

```sql
-- Decision Agent scrape (manual, R-Q1-G-004)
SELECT
  CASE WHEN COUNT(*) >= 3 THEN 1 ELSE 0 END AS city_active_tirupati,
  COUNT(*) AS verified_pandit_count
FROM priests
WHERE city = 'Tirupati'
  AND aadhaar_verified = true
  AND active = true;
-- target: city_active_tirupati = 1 (>= 3 verified pandits)
```

## Verify (post-deploy)

1. `curl -s -o /dev/null -w "%{http_code}" https://darshya.online/te/tirupati` — expect 200 (once founder lands page)
2. `curl -s https://darshya.online/te/tirupati | grep -c "తిరుమల"` — expect ≥1 (Telugu Tirumala name)
3. `curl -s https://darshya.online/te/tirupati | grep -c "వెంకటేశ్వర"` — expect ≥1 (Venkateswara)
4. `curl -s https://darshya.online/city/tirupati | grep -ci "venkateswara"` — expect ≥1 (English city page retained)
5. `curl -s https://darshya.online/sitemap.xml | grep -c "/te/tirupati"` — expect ≥1

## Note on item ID

This handoff covers `R-Q1-G-004` (Tirupati supply onboarding — 4th city candidate) per the spec file at `docs/roadmap/items/Q1/geo/004-tirupati-supply-onboarding-4th-city-candidate.md`. Original ship request referenced `R-Q1-G-007` (Hyderabad) but item title pinned this to Tirupati; aligned to file's frontmatter id.
