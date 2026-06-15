# R-Q2-M-006 Founder Handoff — NRI Google Ads $200/mo Scale (US+UK+CA+AU)

> **Roadmap item**: R-Q2-M-006 (P1, est 8h) · **Status**: in_progress · **Authored**: 2026-06-15 (R4 batch)
> **Spec**: `docs/marketing/nri-google-ads-scale-q2-spec.md` (R3 batch, 2026-06-13)
> **Depends on**: R-Q1-M-011 (NRI Facebook Ads $50 baseline)

## Why this handoff and not status=shipped

KPI `nri_ads_spend_monthly`: target `$200 USD/mo`. Hitting target requires:

1. Founder-owned Google Ads MCC account (billing card on file)
2. Actual ad spend committed monthly
3. Per-geo billing entity verification in some cases (UK/CA/AU)

No code change, no script, no agent run can advance the spend counter from 0→$200. **Status stays `in_progress` until founder confirms first $200 cycle billed.** Per R2 lesson — flipping status to `shipped` when KPI needs founder action lost 4 PRs in prior round.

## Founder action checklist (sequential — do NOT skip steps)

### Step 0 — prerequisites (one-time, ~30 min)

- [ ] R-Q1-M-011 NRI Facebook Ads $50/mo baseline running for ≥4 weeks (need CPM/CTR data to set Google bid ceilings)
- [ ] PostHog NRI funnel events live (signup, first_puja, gift_puja_NRI) — verify via `/admin/agents/funnel-drop-analyzer` daily report
- [ ] Razorpay Stripe NRI lane KYC complete (U2 activation gate per `docs/activation-gates.md`) — without this Google Ads will drive traffic to a broken checkout

### Step 1 — Google Ads account setup (~45 min)

- [ ] Sign in to https://ads.google.com with founder@darshya.online (or chosen ops email)
- [ ] Create new account, currency = USD, time zone = Asia/Kolkata
- [ ] Verify billing card (Indian or US-domiciled card both fine; INR card auto-converts USD spend)
- [ ] Enable manager (MCC) account if planning more than 1 client later
- [ ] Link to Google Analytics 4 property `darshya.online` (Admin → Property → Google Ads Links)
- [ ] Link to Google Search Console (Admin → Property → Search Console Links) — enables paid+organic blended reports

### Step 2 — conversion tracking (~30 min, BEFORE turning on campaigns)

- [ ] Tools → Conversions → New conversion action
- [ ] Source = Website, category = Signup, name = "NRI signup", value = $0, count = One
- [ ] Same for "First puja booking", category = Purchase, value = "Use different values per conversion", currency = USD
- [ ] Install Google tag via `apps/web/app/layout.tsx` GTM container (already wired per R-Q1-M-005). Add Google Ads conversion linker tag in GTM workspace.
- [ ] Verify firing via Google Tag Assistant on `/nri` page → submit waitlist → check conversion event fires within 3min

### Step 3 — landing pages (~2h ENGINEERING — separate ticket R-Q2-M-006a)

> NOT included in this scaffold. R-Q2-M-006a tracks `/nri/usa /nri/uk /nri/ca /nri/au` variant pages. File ticket as engineering blocker before launching paid campaigns. WITHOUT geo variants, $200 spends on generic `/nri` and converts at half the rate.

### Step 4 — campaign creation (~1h, do all 3 in one session)

Use the existing spec verbatim: `docs/marketing/nri-google-ads-scale-q2-spec.md` §Campaign structure.

- [ ] Campaign 1 — Search "remote puja from {geo}" — $120/mo (US $60, UK $25, CA $20, AU $15)
- [ ] Campaign 2 — Search "online shraddha" — $60/mo (US $30, UK $15, CA $10, AU $5)
- [ ] Campaign 3 — Display retargeting — $20/mo (audience: `/nri` visitor + no signup, 30d window)

Per-campaign:
- Bid strategy = Maximize Conversions (NOT Maximize Clicks — drives junk traffic)
- Target CPA = $20 (matches CAC ceiling)
- Negative keywords list (shared across all 3): "free", "torrent", "pirated", "hindi movie", "porn", "bhojpuri", "song download", "lyrics"
- Ad schedule: 06:00–23:00 in target geo timezone (avoids 2am-spam click farms)
- Device: desktop + mobile only (exclude tablet — terrible NRI conversion)
- Audience signals: "Hinduism interest", "India travel", "Diaspora communities", in-market for "Religious services"

### Step 5 — copy + creative (~1h)

3 ad variants per campaign (Google requires min 3 RSA per ad group):

**Headlines** (15 char max each, pick 10 of 15):
- "Puja in India, you watch live"
- "Pandit-verified, video proof"
- "Book puja from {city}" (dynamic geo)
- "Shraddha in Gaya remotely"
- "80G receipt + USD pricing"
- "Live aarti every morning"
- "Trusted by 1,000+ NRIs"
- "10-min booking, no calls"
- "Real Sanskrit, no shortcuts"
- "Built by Indian founder"

**Descriptions** (90 char max, pick 4):
- "Watch your puja live from anywhere. Pandit-verified video proof. Book in 5 min."
- "USD/GBP/CAD/AUD pricing. 80G receipts for India-tax-filing parents. WhatsApp support."
- "Shraddha, Satyanarayan, Rudrabhishek + 50 more pujas. Real pandits, real temples."
- "From $30. No hidden fees. Refund if pandit doesn't show. Watch us on YouTube."

**Sitelinks** (4 required): /nri, /pujas/shraddha, /gift, /testimonials

### Step 6 — launch + monitor (Week 1)

- [ ] Set campaign status = Enabled (NOT auto-applied recommendations — Google's defaults waste budget)
- [ ] Day 1: spend cap = $5 (sanity check, watch for bot traffic)
- [ ] Day 2-3: spend cap = $10/day if Day 1 had real human clicks (>30s session duration in GA4)
- [ ] Day 4-7: lift to full $6.60/day
- [ ] Daily 9am IST review: Spend / Clicks / CTR / Conversions / CPA in one tab
- [ ] Pause any keyword w/ >20 clicks 0 conversions
- [ ] Pause any ad variant w/ <2% CTR after 50 impressions

### Step 7 — month 1 retro (Day 30)

- [ ] Calculate blended CAC = total spend / total NRI signups
- [ ] If CAC > $40 → pause Campaign 1, reallocate to Campaign 2 + Campaign 3
- [ ] If CAC < $15 → propose budget lift to $400/mo (next-quarter roadmap item)
- [ ] Update KPI cell in `docs/roadmap/items/Q2/marketing/006-*.md` → set `current: 200` + `verified_at: <date>` + `shipped_at: <date>`
- [ ] Set roadmap status to `shipped` ONLY after first full $200 cycle is invoiced + verified in Google Ads billing tab

## Spend tripwires (per `docs/roadmap-archive.md` §Strategy tripwires)

- Blended NRI CAC > $40 by week 8 → trigger reallocation
- NRI Day-30 retention < 25% by week 8 → pause Google Ads, audit /nri funnel before resuming
- NRI annual:per-puja ratio < 1:3 by week 12 → fold to NRI-only SKU pivot (per main roadmap tripwire)

## Free-tier discipline

Google Ads is NOT a free-tier product. $200/mo is real cash. Per `docs/free-tier-budgets.md` discipline:

- Confirm Stripe NRI receivables already trending positive (R-Q1-M-011 Facebook Ads attribution shows ≥10 NRI signups + ≥2 paid pujas/mo before launching Google Ads)
- If not — DO NOT START. Fix funnel first; paid traffic to broken funnel = $200 burned.

## What this scaffold did NOT do (intentional non-actions)

1. Create `/nri/usa /nri/uk /nri/ca /nri/au` pages — out of scope for this marketing scaffold, tracked as engineering ticket R-Q2-M-006a
2. Wire Google Ads conversion pixel in GTM — needs founder Google Ads account ID first (R-Q2-M-006c)
3. Create PostHog NRI funnel events — R-Q2-M-006b
4. Set `kpi.query` in roadmap item — manual KPI source; founder pastes monthly Google Ads spend total to `docs/roadmap/items/Q2/marketing/006-*.md` once cycle invoiced
5. Compose actual ad creative variants — listed as templates above; founder picks final 3 per campaign

## Verification gate before flipping status=shipped

ALL of the following must be true:

- [ ] Google Ads account exists + billing verified
- [ ] Conversion tracking firing (verified in Tag Assistant)
- [ ] R-Q2-M-006a geo landings live (4 variant pages 200-OK)
- [ ] R-Q2-M-006b PostHog NRI funnel events live (visible in `/admin/metrics/funnel`)
- [ ] R-Q2-M-006c conversion pixel firing
- [ ] First full month $200 spend invoiced + screenshot saved to `docs/marketing/assets/google-ads-month-1-invoice.png`
- [ ] CAC computed + posted to roadmap item `kpi.current`
- [ ] Founder explicit "ship" decision documented in next round handoff

## Closes

R-Q2-M-006 scaffold — handoff doc shipped. Status remains `in_progress` until founder completes Steps 1-7 + verification gate. **Per pitfalls rule, no auto-claim to shipped.**

## Related items (Q2 marketing batch coherence)

- R-Q1-M-011 — NRI Facebook Ads $50/mo baseline (dependency, must be running first)
- R-Q2-M-006a — 4 geo landing pages (engineering ticket, separate)
- R-Q2-M-006b — PostHog NRI funnel events (engineering, separate)
- R-Q2-M-006c — Google Ads conversion tracking pixel (engineering, separate)
- R-Q3-M-* — NRI Google Ads scale to $500/mo (if month-1 CAC < $15)
