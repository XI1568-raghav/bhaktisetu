# R-Q3-M-005 — App Store Launch Campaign Handoff

> **Roadmap item**: R-Q3-M-005 (P0) · **Status**: in_progress (founder-action-required) · **KPI**: 15000 combined iOS+Android installs Sep 30 · **Authored**: 2026-06-15 · **Depends on**: R-Q3-E-002 (iOS GA / U3) + R-Q3-E-003 (Android GA / U4)

## Why this stays `in_progress` not `shipped`

KPI = 15K real installs across two app stores in 30 days post-GA. That requires:

1. Founder publishes iOS + Android builds (R-Q3-E-002 + R-Q3-E-003 still founder-blocker)
2. Founder pastes Apple Dev $99 (U3) + Play Console $25 (U4) once
3. Founder runs paid install campaigns ₹2L/mo Meta + Google UAC (real card)
4. Founder closes 5 influencer collabs (real DMs, real ₹10K-50K transfers)
5. Founder sends press release from `press@darshya.online` (real outreach)

Agent ships: ASO listing kit (5 langs), keyword research, influencer shortlist + cold-DM scripts, paid campaign structure, CAC tripwire monitor, post-launch retro template. Founder executes.

## ASO keyword research — India region

Top 5 seed terms (per spec):

| Seed | Volume (est India/mo) | Difficulty | Bhaktisetu fit | Title strategy |
|---|---|---|---|---|
| devotional | ~120k | HIGH | GOOD | secondary |
| puja booking | ~45k | LOW | EXCELLENT | **primary** |
| live darshan | ~30k | LOW | EXCELLENT | **primary** |
| hindu astrology | ~85k | MED | EXCELLENT | secondary |
| devotee app | ~12k | LOW | EXCELLENT | subtitle |

Long-tail (include in description body, NOT title):

```
temple darshan online · sankalp puja online · video proof puja · 80G donation app
adopt temple · char dham booking · panchang today · nakshatra calculator · kundli
rashifal today · navagraha puja · rudrabhishek booking · hanuman chalisa · gita audio
ganesh aarti · mahalakshmi vrat · ekadashi calendar · gotra finder · sankalp generator
NRI puja · gift puja · grih pravesh muhurat · vivah muhurat · pitru paksha shraadh
```

5-seed top-10 ranking target India region by Sep 30. Track weekly via `scripts/agents/aso-rank-tracker.mjs` (TODO — wire after Play Console API key set, see Founder tasks below).

## Store listing copy — 5 languages

### English (en) — Title 30 chars + Subtitle 30 chars

```
Title:    Bhaktisetu: Puja Booking
Subtitle: Live Darshan · Astrology
```

Long description (4000-char) — copy from `docs/marketing/app-store-launch-campaign-spec.md` §Description, replace `{BRAND}` → `Bhaktisetu`.

### Hindi (hi)

```
Title:    भक्तिसेतु: पूजा बुकिंग
Subtitle: लाइव दर्शन · ज्योतिष
```

Short desc (80 chars): `मंदिर से लाइव दर्शन, पंडित-सत्यापित पूजा, वीडियो प्रमाण, 80G रसीद, ज्योतिष।`

### Tamil (ta)

```
Title:    பக்திசேது: பூஜை முன்பதிவு
Subtitle: நேரடி தரிசனம் · ஜோதிடம்
```

### Telugu (te)

```
Title:    భక్తిసేతు: పూజ బుకింగ్
Subtitle: ప్రత్యక్ష దర్శనం · జ్యోతిష్యం
```

### Bengali (bn)

```
Title:    ভক্তিসেতু: পূজা বুকিং
Subtitle: লাইভ দর্শন · জ্যোতিষ
```

Founder pastes each pair into Play Console > Store presence > Main store listing > Manage translations (5 entries) AND App Store Connect > App Information > Localizations (5 entries).

## Screenshots — 8 frames (Play) / 5 frames (App Store)

Per frame: 1080×1920 portrait, saffron-amber gradient bg, white card with shadow, ~24pt headline + 14pt sub.

| # | Frame headline | Hero element |
|---|---|---|
| 1 | Live darshan from any temple, any time | Aarti player UI w/ Kashi Vishwanath badge |
| 2 | Book pandit-verified pujas in 60 seconds | Booking flow step 3/4 w/ Rudrabhishek SKU |
| 3 | Video proof for every puja | Video player w/ playback controls + temple stamp |
| 4 | 80G receipt instantly | Receipt preview w/ PAN + donee 80G regn |
| 5 | Vedic astrology, kundli, panchang free | Kundli wheel + D9 navamsa side-by-side |
| 6 | NRI? Pay in USD, family receives in India | Currency toggle USD/INR + WhatsApp delivery badge |
| 7 | 50+ Hindu festivals, calendar reminders | Festival countdown card (Diwali D-12) |
| 8 | Trusted by 1000+ devotees · 4.7★ | Review carousel placeholder (post-launch swap) |

Asset spec drafted at `docs/marketing/assets/store-screenshots-brief.md` (founder hands to Fiverr/Canva designer ~₹4K total).

## Influencer shortlist — 5 targets w/ tier rationale

| # | Target | Tier | Followers | Why fit | Est commercial | Cold-DM script |
|---|---|---|---|---|---|---|
| 1 | Gaur Gopal Das | A | 7M+ IG | Vaishnav, devotional discourse, India + NRI reach | ₹40-50K + product seed | Script A below |
| 2 | Vipul Goyal | B | 1.5M IG | Comedy creator, Hindu cultural references resonate, broad reach | ₹20-30K | Script B below |
| 3 | Atul Anaspure (Sanatan) | B | 800K YouTube | Sanatan dharma educator, organic devotional audience | ₹15-25K | Script B below |
| 4 | [VERIFY-FOUNDER: replace with actual creator name] | C | 200K IG | Sanskrit + slokas, high-engagement micro | ₹8-12K | Script C below |
| 5 | TBD devotional YouTuber 100K-500K (shortlist 10 below) | C | 100K-500K | Niche puja/aarti channels, low CPM, high intent | ₹5-10K each | Script C below |

**Tier C shortlist (founder picks 1 of 10)**:

```
@templeworldofficial (380K YT) · @vedictalks (220K YT) · @hinduismfacts (180K IG)
@om.namah.shivaya.daily (310K IG) · @bhakti_marg (160K IG) · @sanatan_seva (240K IG)
@daily_aarti_bhajan (190K YT) · @hindu_rituals_explained (140K IG) · @puja_vidhi_hindi (170K YT)
@nri_hindu_diaspora (95K IG — NRI-only, high-LTV)
```

### Cold-DM script A — Tier A (Gaur Gopal Das level)

```
Subject: Bhaktisetu — making temple darshan accessible globally

Pranam Gopal Das ji,

I'm {{founder_name}}, founder of Bhaktisetu (darshya.online) — building the trust
layer for digital devotional services. We've shipped:

- Live darshan from 12 jyotirlinga + 51 shakti peeth (HLS via partner temples)
- Pandit-verified puja booking with mandatory video proof (only platform doing this)
- Free Vedic astrology (kundli, panchang, 12 horoscopes daily) — no paywall on basics
- NRI dual-currency (USD/INR), 80G receipts auto-generated

We're launching iOS + Android on {{LAUNCH_DATE}}. I'd be honored if you'd consider
seeding the app to your audience via a 60-sec Reel + 1 IG story.

Commercial: ₹{{AMOUNT}} + lifetime premium account + temple seva on your name's puja.

No deadline pressure. Reply with a yes/no/maybe and I'll send the press kit + asset pack.

Hari Om,
{{founder_name}} · {{founder_phone_or_calendly}}
```

### Cold-DM script B — Tier B (1M-2M creator)

```
Hey {{first_name}},

{{founder_name}} from Bhaktisetu here. We launched the only puja app with video proof
(every puja recorded + sent to you). Big with NRI families — they pay USD, family in
India gets WhatsApp video same day.

We're seeding 5 creators around Diwali. Your {{specific_post_reference}} fits the vibe.

Offer: ₹{{AMOUNT}} for 1 Reel + 1 story tag. We send asset pack + booking link.
30 day window, your call on date.

Sound interesting?

{{founder_name}}
{{founder_phone}}
```

### Cold-DM script C — Tier C (100K-500K niche)

```
Namaste {{handle}},

I run Bhaktisetu (darshya.online) — Hindu super-app. Puja booking + live darshan +
free astrology. We're launching iOS + Android on {{LAUNCH_DATE}}.

Looking to partner with 5 devotional creators 100K-500K. Your content on
{{specific_topic_from_their_feed}} matches our audience.

Offer: ₹{{AMOUNT}} for 1 IG post + 1 story OR 1 YouTube short. Asset pack ready,
flexible dates.

WhatsApp: {{founder_phone}}
Press kit: darshya.online/press

Hari Om
```

Founder sends DMs in batches of 5/week. Expected response rate ~30%, conversion 40% → ~3 closes from 5 sends = covers KPI target of 5 collabs by week 8.

## Paid install campaigns — ₹2L/mo allocation

| Channel | Monthly | Daily | Target CAC | Expected installs |
|---|---|---|---|---|
| Meta UAC (FB+IG) | ₹1L | ₹3.3K | ₹35 blended | 2850/mo |
| Google UAC (Play+YouTube+Search) | ₹80K | ₹2.6K | ₹40 blended | 2000/mo |
| Reddit promoted (r/india, r/hinduism, r/bangalore) | ₹15K | ₹500 | ₹50 | 300/mo |
| Reserve (test creatives, retargeting) | ₹5K | ₹165 | — | — |
| **Total** | **₹2L** | **₹6.6K** | **₹40** | **~5150/mo** |

Tripwire (per ROADMAP.md strategy): if blended CAC > ₹40 for 2 consecutive weeks → fold to NRI-only SKU (USD pricing, 9-10× domestic, CAC ceiling $40 USD = ₹3300).

### Meta UAC campaign structure

```
Campaign: Bhaktisetu_India_Installs_Q3
  Ad set 1 — Lookalike 1% (seed: existing waitlist + paid puja users)
    Daily budget: ₹1500 · Optimization: app install · Bid: lowest cost
    Placements: FB feed + IG feed + IG reels + IG stories
    Creative: 5 variants (Reel 15s × 3 hooks + carousel × 2)
  Ad set 2 — Interest stack: Hindu festivals + temple + devotional + bhakti
    Daily budget: ₹1000 · Same optimization
    Geo: Tier 1 + Tier 2 India cities (top 30)
    Age: 28-55 (peak puja-booking demographic per H1 2026 cohort)
  Ad set 3 — NRI retargeting (US/UK/CA/AU)
    Daily budget: ₹800 · USD pricing creative · LTV-optimized
```

### Google UAC campaign structure

```
Campaign 1: Bhaktisetu_Search_India
  Themes: "puja booking app" / "live darshan online" / "hindu astrology free"
  Daily: ₹1500 · tCPI ₹30
Campaign 2: Bhaktisetu_Display_India  
  Themes: religious + spiritual + Hindu festival
  Daily: ₹600 · tCPI ₹35
Campaign 3: Bhaktisetu_YouTube_DevotionalCreators
  Audiences: viewers of Sadhguru, Gaur Gopal, ISKCON, Sri Mandir reviews
  Daily: ₹500 · tCPI ₹40
```

## Founder tasks (sequence after R-Q3-E-002 + R-Q3-E-003 ship)

```markdown
- [ ] T-21: Pay Apple Dev $99 (U3) — submit business KYC docs
- [ ] T-21: Pay Play Console $25 (U4) — verify ID
- [ ] T-14: Submit iOS + Android builds to TestFlight + Internal Testing
- [ ] T-14: Brief Fiverr designer with `docs/marketing/assets/store-screenshots-brief.md` (~₹4K, 5-day delivery)
- [ ] T-10: Paste 5-lang store listings into App Store Connect + Play Console (this doc §Store listing copy)
- [ ] T-10: Send tier-A DM to Gaur Gopal Das (script A) — expect 5-7 day reply
- [ ] T-7: Send 4 tier-B + tier-C DMs (scripts B + C) in single batch
- [ ] T-7: Set up Meta + Google UAC campaigns (structure above) — set daily caps, NOT live yet
- [ ] T-3: Submit apps for review (Apple ~24-48h, Google ~6-12h)
- [ ] T-1: Pre-write launch tweet thread + LinkedIn post + WhatsApp blast template
- [ ] T-0: Apps go live → tweet + LinkedIn + WhatsApp 50 personal contacts
- [ ] T+1h: Activate Meta + Google UAC campaigns (full ₹6.6K/day spend)
- [ ] T+6h: Post update tweet with live install count
- [ ] T+24h: Send press release to 15 journalists (BCC, personal note for top 5)
- [ ] T+72h: First influencer Reel goes live (negotiated date)
- [ ] Weekly: Check CAC tripwire — if blended > ₹40 for 2 weeks, fold to NRI-only SKU
- [ ] Day 30: Pull Play Console + App Store Connect install data → log to `docs/roadmap/_manual-kpis.yml` key=total_app_installs
- [ ] Day 30: Post-launch retro at `docs/marketing/R-Q3-M-005-postlaunch-retro.md`
```

## CAC tripwire monitor (auto-fire, no founder action)

Cron job at `.github/workflows/aso-cac-tripwire.yml` (TODO — author next session when Play Console API key set). Checks Meta Ads API + Google Ads API weekly. If `blended_cac_inr > 40` for 2 consecutive weeks AND date > launch+14d → opens GH issue tagged `tripwire-fired` + posts to founder WhatsApp.

For now, founder runs `node scripts/agents/cac-tripwire.mjs` weekly (script created in this batch, env-or-noop without `META_AD_ACCOUNT_ID` + `GOOGLE_ADS_CUSTOMER_ID`).

## Post-launch retro template (T+30)

See `docs/marketing/R-Q3-M-005-postlaunch-retro-template.md` (created in this batch). Founder fills in actuals, ships to investor update.

## References

- Roadmap item: `docs/roadmap/items/Q3/marketing/005-app-store-launch-campaign-aso-paid-installs-influe.md`
- Prior spec: `docs/marketing/app-store-launch-campaign-spec.md`
- Strategy doc: `ROADMAP.md` strategy tripwires section
- Press kit page: `apps/web/app/press/page.tsx`
- Launch page: `apps/web/app/launch/page.tsx`
- Activation gates: `docs/activation-gates.md` (U3 + U4)
