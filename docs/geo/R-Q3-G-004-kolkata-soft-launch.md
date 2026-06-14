# R-Q3-G-004 — Kolkata soft launch (25 pandits + 5 temples + 1K MAU) — handoff

> Status: engineering scaffold ready; supply onboarding + MAU activation blocked on founder execution.
> Pre-reqs: R-Q3-S-002 (25 Kolkata pandits onboarded) + R-Q3-S-009 (5 Kolkata temples verified) MUST ship first.
> Quarter: Q3 (Jul–Sep). Durga Puja overlap (Sep–Oct) = highest-traffic Bengali devotional window of year.

## Success criteria

| # | Criterion | Status | Owner |
|---|---|---|---|
| 1 | 25 verified Kolkata pandits onboarded | ⏳ blocked-on-founder | Founder KYC + sales drip |
| 2 | 5 verified Kolkata temples (Shakta-bias anchor set) | ⏳ blocked-on-founder | Founder + ops MoU |
| 3 | 1000 Kolkata MAU (30-day rolling, sessions.city='Kolkata') | ⏳ blocked-on-supply | Demand activation post supply ready |
| 4 | /bn Bengali landing live with Kolkata-local CTAs | ✓ exists (`apps/web/app/bn/page.tsx`) — needs Kolkata-local CTAs + Durga Puja seasonal feature | This batch documents the gap |
| 5 | Durga Puja seasonal hub (Sep–Oct) | ⏳ planned | Engineering scaffold + content sprint Aug–Sep |

## Anchor temple set (Shakta-bias matches Bengal devotional culture)

| Temple | Tradition | Significance | Onboarding angle |
|---|---|---|---|
| Kalighat Kali Temple | Shakta — Shakti Peeth | One of 51 Shakti Peethas; Kali's right toe fell here | Highest pilgrim-volume in Kolkata; pandit network well-established |
| Dakshineswar Kali Temple | Shakta — Ramakrishna anchor | Ramakrishna Paramahansa's seat; modern Bengal Bhakti origin | Strong NRI Bengali sentiment; potential Belur Math co-marketing |
| Belur Math | Vaishnava + Universal — Vivekananda math | Headquarters of Ramakrishna Mission; founded 1899 | High-trust organizational anchor; opens Mission Society partnership |
| Birla Mandir (Lakshmi Narayan) | Vaishnava | Modern marble temple; tourist + local | Easier MoU close (Birla Trust admin model) |
| Pareshnath Jain Temple (Burrabazar) | Jain | Multi-faith inclusion + Marwari community anchor | Demonstrates pan-religious commitment; Marwari donation pipeline |

## What shipped this batch (engineering side)

- **Kolkata handoff doc** (this file) — supply playbook + Durga Puja seasonal plan + KPI tracking + dependency map.
- **/bn Bengali landing audit** — page lives at `apps/web/app/bn/page.tsx` shipping the `LangLanding` shell with 6 feature cards. Needs (a) Kolkata-local CTA injection (e.g. "কলকাতার মন্দিরে পূজা বুক করুন") and (b) Durga Puja seasonal hub linkage before Q3 close. Tracked as carry below.
- **KPI tracked in frontmatter** via `kpi.query` SQL — Decision Agent scrapes nightly into `_kpi-state.json`. When pandit count + temple count + MAU all hit thresholds, status flips to `shipped` (founder triggered, not agent).

## Verification cheatsheet (engineering surface)

```bash
# Bengali landing already live
curl -s -o /dev/null -w "%{http_code}" https://darshya.online/bn
# expect 200

# Kolkata city page (existing /city programmatic-SEO route)
curl -s -o /dev/null -w "%{http_code}" https://darshya.online/city/kolkata
# expect 200 (already exists via lib/cities.ts entry from earlier batch)

# Live pandit count (target 25)
curl -s "https://api.darshya.online/api/v1/priests?city=Kolkata&limit=30" | jq '.data | length'
# expect: starts 0 in early Q3, target 25 by Sep close

# Live temple count (target 5)
curl -s "https://api.darshya.online/api/v1/temples?city=Kolkata&limit=10" | jq '.data | length'
# expect: starts 0, target 5 by Sep close
```

## Sales / onboarding tactics (per agent_brief)

### Pandit acquisition (25 total)

1. **Cold-temple-outreach agent — Kolkata segment**. Add Kolkata bbox to `scripts/agents/cold-temple-outreach.mjs` config + verified phone enrichment.
2. **Kalighat priest network** — founder cold-visit to the temple committee; 5–8 priests on Kalighat panel.
3. **Dakshineswar priest committee** — Ramakrishna Mission has a vetted purohit list; founder warm intro via Mission Society.
4. **Belur Math monastics** — 3–5 brahmacharis available for online consultation roles (Vedanta + scripture).
5. **Bengali Brahman Sabha + Smarta Bengali community FB groups** — paid post with ₹500 referral incentive per onboarded priest.
6. **North Kolkata bonedi families** (Sovabazar Rajbari, Shobhabazar Rajbari, Hatkhola) — traditional Durga Puja patron priests with deep local sthapatya tradition.

### Temple acquisition (5 total — anchor set above)

1. **Kalighat** — Trust office; MoU pitch requires offline meeting + initial 10% commission discount.
2. **Dakshineswar Kali** — Ma Sarada Mission contact; partnership with bookings flows through Mission accounting.
3. **Belur Math** — formal Mission Society partnership form + governance review (allow 30–45 days lead time).
4. **Birla Mandir** — Birla Trust admin; easier close (precedent: similar trusts in Delhi/Bhopal already digital).
5. **Pareshnath Jain** — Marwari Jain Sabha Burrabazar; opens parallel funnel for Jain ritual bookings.

### MAU activation (1000 distinct/30d)

1. **Google Ads geo-targeted Kolkata** → /bn or /city/kolkata landing (post supply ready, mid-Aug).
2. **Bengali influencer collabs** (per agent_brief): Sourav Das, Anupam Roy, top 3–5 Bengali Bhakti YouTubers (e.g. Mahishasura Mardini reciters, Durga Puja chroniclers). Barter-for-visibility = $0 cash.
3. **Durga Puja pandal-sponsorship co-marketing** — low-cost barter (₹10–25k per pandal) for digital banners at top-10 Kolkata pandals (Bagbazar, Mohammad Ali Park, Suruchi Sangha, Tridhara, etc).
4. **WhatsApp broadcast** to Bengali phone leads (Resend + WhatsApp Meta Cloud, env-or-noop) post each pandit + temple go-live.
5. **/bn Kolkata-specific CTA strip** — engineering carry: inject Kolkata pandit count + Durga Puja countdown banner on /bn landing.

## Durga Puja seasonal hub (Sep–Oct) — engineering scope

| Item | Effort | Owner |
|---|---|---|
| `/durga-puja` season hub (en + bn) — Mahalaya countdown, top-10 Kolkata pandals map, dhunuchi nritya video gallery, Asthami pushpanjali livestream embed, Sandhi Puja muhurta calc | M (1–2 weeks engineering) | Engineering (post supply ready signal) |
| `/durga-puja/[year]/[city]` per-city sub-route (Kolkata, Howrah, Hooghly, Burdwan, Murshidabad, NRI Kolkata diaspora — US/UK/AU/Singapore) | M | Engineering |
| Pandal listing schema — name, lat/lng, theme, idol height, organizer society, founded year, hours, MapsURL | S | Founder data entry + agent enrichment |
| Mahalaya audio embed (Birendra Krishna Bhadra recitation public-domain copy) | S | Engineering |
| Asthami pushpanjali livestream booking flow — same engine as `/pujas/[slug]/book` with Durga-specific puja entries | S (reuse) | Engineering |
| Promo content series — agent-issue-filer + content-publisher drip 1 post/day Aug 15 → Oct 15 | XS (existing agents) | Already wired |

**Not in this batch**: Durga Puja hub deferred to mid-Aug engineering sprint once R-Q3-S-002 + R-Q3-S-009 onboarding crosses 50% (≥12 pandits + ≥3 temples). Premature hub launch with empty supply = bad UX + bad SEO.

## Founder action items (BLOCKING — agent cannot do these)

1. **KYC video calls × 25 Kolkata pandits** across Jul–Sep. ~30min each. Aadhaar + qualification verification.
2. **Temple MoU × 5** — schedule a 3–4 day Kolkata trip (recommended: Aug or early Sep so Durga Puja onboarding is complete before Mahalaya).
3. **PostHog Kolkata cohort** — define cohort filter `properties.city == "Kolkata" OR user_city == "Kolkata"` + Bengali UI session segment.
4. **Google Ads budget** — ₹20–30k/month geo-targeted Kolkata, escalate to ₹50k+ during Durga Puja window (Sep–Oct).
5. **Bengali influencer outreach** — manual DM to Sourav Das + Anupam Roy + 3–5 Bengali Bhakti YouTubers. Pitch: 1-week trial pujabooking link → revenue share / barter content.
6. **Mahalaya + Durga Puja co-marketing decision** — by end-Jul: which 5–10 pandals to barter-sponsor; budget allocation ₹50k–₹2L.

## Dependencies (BLOCKING)

- **R-Q3-S-002** (25 Kolkata pandits onboarded) — must ship for criterion 1.
- **R-Q3-S-009** (5 Kolkata temples verified) — must ship for criterion 2.
- **R-Q3-P-XXX** (Durga Puja hub engineering) — to be scoped + dispatched in mid-Aug.

## KPI scrape (Decision Agent nightly)

```sql
-- kolkata_mau (target 1000)
SELECT COUNT(DISTINCT u.id)
FROM "User" u
JOIN "UserSession" s ON s.user_id = u.id
WHERE u.city ILIKE '%kolkata%'
  AND s.last_active_at >= NOW() - INTERVAL '30 days';

-- kolkata_pandit_count (target 25)
SELECT COUNT(*) FROM "Priest" WHERE city ILIKE '%kolkata%' AND is_verified = true;

-- kolkata_temple_count (target 5)
SELECT COUNT(*) FROM "Temple" WHERE city ILIKE '%kolkata%' AND is_verified = true;
```

## Carry (next engineering batches)

1. **/bn Kolkata-local CTA injection** — small frontend patch on `apps/web/app/bn/page.tsx` adding a Kolkata pandit-count chip + Durga Puja countdown banner. Defer to post supply ≥12 pandits.
2. **Durga Puja seasonal hub** — full engineering sprint (see scope above) mid-Aug.
3. **/city/kolkata richness audit** — verify `apps/web/lib/cities.ts` Kolkata entry has all 5 anchor temples + Bengali transliterations + Durga Puja seasonal flag.
4. **Bengali influencer affiliate codes** — generate dedicated referral codes for the 5–10 influencers (existing `/refer` infra supports this).

## Status flip criterion

When ALL THREE hold:
- `kolkata_pandit_count >= 25` (via Supabase scrape)
- `kolkata_temple_count >= 5` (via Supabase scrape)
- `kolkata_mau >= 1000` (30-day rolling)

…Decision Agent auto-flips frontmatter `status: shipped` + sets `shipped_at`. Until then, status stays `in_progress` regardless of engineering work shipped.
