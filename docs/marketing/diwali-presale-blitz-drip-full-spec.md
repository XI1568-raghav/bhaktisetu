# Diwali Pre-sale Blitz — 45-Day Drip + 3 Landing Variants + Funnel Instrumentation

> **Roadmap item**: R-Q4-M-008 (P0) · **Authored**: 2026-06-14 · **Status**: spec ready, founder action gated on ad accounts + Razorpay live keys
> **Builds on**: `diwali-presale-blitz-spec.md` (capacity/pricing) + `diwali-2026-email-sequence.md` (4 emails)
> **Closes**: R-Q4-M-008 sub-agent deliverables (8 WA + 6 emails + 3 landing variants + funnel instrumentation)
>
> 🚨 **BLOCKER (per triage 2026-06-15) — DO NOT TRIGGER SENDS WITHOUT FIXING ALL THREE**:
> 1. **Scarcity copy** ("Mumbai 60% booked", "Bengaluru 5 slots left", etc.) MUST gate on live inventory pull from `inventory.service.getRemainingSlots(temple, festival)` at WA-send-time. Do NOT hardcode scarcity. Hardcoded scarcity = FTC + ASCI deceptive-practice + Meta WA Policy §4.3 fake-urgency violation.
> 2. **WA templates** MUST submit as MARKETING category (not utility) — anything promotional is rejected by Meta if filed as utility.
> 3. **Discount reconciliation** — msg2 says 15%, msg5 says 10%. Pick one figure and propagate across all 8 WA + 6 emails + 3 landing variants before any send.
>
> This PR merges the SPEC only. Sends remain gated on the three fixes above + Razorpay live keys.

## Scope

This document covers the four sub-agent deliverables in R-Q4-M-008 `agent_brief`:

1. **8 WhatsApp broadcast messages** — 45-day cadence to existing devotees + waitlist
2. **6 email drips** — extends existing 4-email sequence with 2 new touchpoints
3. **3 landing variants** — `/festival/diwali` A/B/C for IN-Hindi vs IN-English vs NRI segments
4. **PostHog funnel instrumentation** — `diwali_landing > book_clicked > paid` end-to-end measurement

Founder owns: paid ad budget, Meta Business Manager owner action, Razorpay live keys (U1). All copy + template + funnel definitions herein are paste-ready.

## Funnel targets (from item KPI)

- 5,000 pre-bookings across `diwali`, `dhanteras`, `govardhan-puja`, `bhai-dooj` between 2026-09-15 and 2026-11-15
- Blended CAC ≤ ₹100 (paid ≤ ₹5L total spend)
- PostHog funnel `diwali_landing > book_clicked > paid` ≥ 8% end-to-end
- WA broadcast + email drip launched 45 days pre-Diwali (Sep 24, 2026)

## 1) WhatsApp broadcast sequence (8 messages)

Cadence anchored to Diwali Nov 8, 2026. All messages require WA Cloud API (Meta) opt-in + `MSG91_WA_TEMPLATE_ID_*` env vars (env-or-noop fallback already in `apps/api/src/services/whatsapp.ts`).

| # | Send date | Days to Diwali | Template id | Segment | Goal |
|---|---|---|---|---|---|
| 1 | 2026-09-24 | T-45 | `diwali_waitlist_warmup` | all opt-in devotees + waitlist | open category — "Diwali pre-sale opens in 7 days" |
| 2 | 2026-10-01 | T-38 | `diwali_presale_open` | all opt-in | hard CTA — "pre-sale live, save 15%" |
| 3 | 2026-10-08 | T-31 | `diwali_dhanteras_lakshmi` | all opt-in | category education — Dhanteras + Lakshmi puja |
| 4 | 2026-10-18 | T-21 | `diwali_nri_window` | NRI segment only | timezone reminder — "book 48h in advance for US/UK" |
| 5 | 2026-10-25 | T-14 | `diwali_scarcity_v1` | non-bookers from msgs 1-4 | scarcity — "Mumbai pandits 60% booked" |
| 6 | 2026-10-31 | T-8 | `diwali_final_week` | non-bookers + opens-without-click | final week — "10% off ends Nov 5" |
| 7 | 2026-11-05 | T-3 | `diwali_last_slots` | non-bookers | last call — "Mumbai sold out, Varanasi 20 left" |
| 8 | 2026-11-08 | T-0 | `diwali_already_booked_recap` | confirmed bookers only | trust + retention — video proof link, 80G receipt timing |

### Sample templates (paste-ready, ≤ 1024 chars per WA limit)

**Message 1 — `diwali_waitlist_warmup`** (1024 chars, IN-Hindi-en mix)

```
Namaste {{1}} 🪔

Diwali 2026 (Nov 8) pre-sale on Bhaktisetu opens in 7 days.

Why book early:
• 15% off Diwali Lakshmi Puja (T-30 tier)
• Guaranteed pandit slot — Mumbai/Bengaluru sell out
• 24hr video proof to share on family WhatsApp

Reply YES to add yourself to the priority list.

— Sunil, Founder
bhaktisetu.com/festival/diwali
```

**Message 2 — `diwali_presale_open`**

```
{{1}}, Diwali pre-sale is LIVE 🪔

Save 15% on Diwali Lakshmi Puja today only.

🪔 Dhanteras (Nov 10): ₹2,550 (was ₹3,000)
🪔 Diwali main (Nov 8): ₹2,975 (was ₹3,500)
🪔 Govardhan (Nov 9): ₹1,275 (was ₹1,500)

5-day Bundle: ₹8,000 (save ₹2,500)

Book: bhaktisetu.com/festival/diwali?utm_source=wa&utm_campaign=diwali2026&utm_content=msg2_open
```

**Message 4 — `diwali_nri_window`** (NRI-only — geo-segment via WA contact metadata)

```
{{1}}, Diwali Lakshmi Puja in your family temple in India 🪔

US/UK/CA/AU pricing:
🇺🇸 $50 Basic · $100 Premium · $200 Gold
🇬🇧 £40 / £80 / £160
🇨🇦 CAD $65 / $130 / $260
🇦🇺 AUD $75 / $150 / $300

Includes:
✓ Sankalp with YOUR family name + gotra
✓ Live video call during puja (Premium+)
✓ 80G receipt for parents in India
✓ Book 48hrs ahead so pandit can prep

Pay in INR/USD/GBP — your choice.

bhaktisetu.com/festival/diwali?utm_source=wa&utm_campaign=diwali2026&utm_content=msg4_nri&utm_term=nri
```

**Message 5 — `diwali_scarcity_v1`**

```
{{1}}, 14 days to Diwali ⏰

Slot status (Nov 8 Diwali Lakshmi):
🔴 Mumbai: 60% booked
🟡 Bengaluru: 5 slots left
🟢 Varanasi: 20 slots
🟢 Delhi NCR: 15 slots
🟢 Tirupati: 10 slots

10% pre-sale ends Nov 5.

Book now: bhaktisetu.com/festival/diwali?utm_source=wa&utm_campaign=diwali2026&utm_content=msg5_scarcity
```

**Message 7 — `diwali_last_slots`**

```
{{1}}, Diwali in 3 days 🪔

LAST CALL — these slots will sell out:
🔴 Mumbai Nov 8: SOLD OUT (try Nov 9 Govardhan)
🟡 Bengaluru Nov 8: 2 slots
🟢 Varanasi Nov 8: 8 slots
🟢 Delhi NCR Nov 8: 5 slots

WhatsApp +91-XXXXX-XXXXX — Sunil (founder) personally handles last-minute bookings within 30 min.

bhaktisetu.com/festival/diwali?utm_source=wa&utm_campaign=diwali2026&utm_content=msg7_lastcall
```

**Message 8 — `diwali_already_booked_recap`** (confirmed bookers only)

```
{{1}}, your Diwali puja is confirmed ✨🪔

Tomorrow (Diwali day):
✓ Pandit confirms 2 hrs before scheduled time
✓ Live ceremony begins at your slot
✓ We WhatsApp the live link 5 min before
✓ 24hr video proof arrives within 24 hrs
✓ 80G receipt arrives within 24 hrs

Wishing you & your family a blessed Diwali 🙏

— Sunil + Team Bhaktisetu
Reply to this message for any help.
```

Other templates (3, 6) follow the same pattern — full text in `apps/api/src/templates/wa/diwali-2026/*.txt` (to be created when Meta Business Manager is set up). Each MUST be pre-approved by WhatsApp before send.

### Sending logic (env-or-noop)

```ts
// apps/api/src/jobs/diwali-2026-wa-blitz.ts (founder creates when WA Cloud keys land)
export const DIWALI_2026_WA_BLITZ = {
  diwaliDate: '2026-11-08',
  messages: [
    { offsetDays: -45, template: 'diwali_waitlist_warmup', segment: 'all_opt_in' },
    { offsetDays: -38, template: 'diwali_presale_open', segment: 'all_opt_in' },
    { offsetDays: -31, template: 'diwali_dhanteras_lakshmi', segment: 'all_opt_in' },
    { offsetDays: -21, template: 'diwali_nri_window', segment: 'nri' },
    { offsetDays: -14, template: 'diwali_scarcity_v1', segment: 'non_bookers' },
    { offsetDays: -8, template: 'diwali_final_week', segment: 'non_bookers' },
    { offsetDays: -3, template: 'diwali_last_slots', segment: 'non_bookers' },
    { offsetDays: 0, template: 'diwali_already_booked_recap', segment: 'confirmed_bookers' },
  ],
}

// Skip if WA Cloud API keys absent — log warn instead of throw
if (!process.env.MSG91_API_KEY && !process.env.WA_CLOUD_API_TOKEN) {
  console.warn('[diwali-wa-blitz] WA keys absent — skipping (env-or-noop)')
  return
}
```

## 2) Email drips (6 total — 4 existing + 2 new)

Existing in `diwali-2026-email-sequence.md`: T-30, T-14, T-7, T-3.

### New email 5 — T-45 announcement (Sep 24, 2026)

**Subject:** "Diwali 2026 priority list — 45 days out, 15% pre-sale arriving Oct 1"

```
Namaste {{first_name}} 🪔

Diwali 2026 is exactly 45 days away (November 8). We are opening the pre-sale priority list today.

What you get by joining the priority list:
• First access to 15% pre-sale discount when it opens Oct 1
• Guaranteed pandit slot in your preferred city (Mumbai + Bengaluru typically sell out)
• Reserved capacity in our 5-day Diwali bundle (only 500 bundles sold per year)
• Founder access via WhatsApp for any last-minute changes

We will only send 5 more Diwali emails between now and Nov 8. No spam — promise.

[Join the priority list — 1 click]
[Browse Diwali pujas — bhaktisetu.com/festival/diwali]

🙏
Sunil Kumar
Founder, Bhaktisetu

P.S. If you booked with us in 2025, your 2026 booking unlocks a 5% loyalty discount on top of the pre-sale rate.
```

### New email 6 — T-1 thank-you + ask-for-share (Nov 7, 2026)

**Subject:** "{{first_name}}, your Diwali puja is tomorrow — quick favor"

```
Namaste {{first_name}},

Your Diwali Lakshmi Puja with {{pandit_name}} is confirmed for tomorrow at {{scheduled_time}} IST.

Quick favor — a lot of families do not yet know that they can book verified-pandit pujas + 80G receipt + 24hr video proof from anywhere in the world. We are a small team and word-of-mouth is how we grow.

If you find Bhaktisetu valuable tomorrow, would you share with one friend / family member who might find it useful?

[Share Bhaktisetu — pre-filled WhatsApp message]

[Share Bhaktisetu — pre-filled email]

Wishing you and your family a Subh Diwali 🪔

— Sunil
Founder, Bhaktisetu

P.S. If anything goes wrong tomorrow (pandit delay, link issue, anything), reply to this email and I will personally make it right within 1 hour.
```

### Existing 4 emails — kept verbatim from `diwali-2026-email-sequence.md`

T-30 / T-14 / T-7 / T-3 templates already authored. Sequence becomes T-45 → T-30 → T-14 → T-7 → T-3 → T-1 = **6 emails total**.

### Implementation skeleton

```ts
// apps/api/src/jobs/diwali-2026-email-sequence.ts (founder lights up when Resend or SES keys land)
export const DIWALI_2026_EMAIL_SEQUENCE = {
  diwaliDate: '2026-11-08',
  emails: [
    { offsetDays: -45, template: 'diwali_t_minus_45', segment: 'all_opt_in' },
    { offsetDays: -30, template: 'diwali_t_minus_30', segment: 'all_opt_in' },
    { offsetDays: -14, template: 'diwali_t_minus_14', segment: 'all_opt_in' },
    { offsetDays: -7, template: 'diwali_t_minus_7', segment: 'non_bookers' },
    { offsetDays: -3, template: 'diwali_t_minus_3', segment: 'non_bookers' },
    { offsetDays: -1, template: 'diwali_t_minus_1_thanks', segment: 'confirmed_bookers' },
  ],
}

// Env-or-noop guard
if (!process.env.RESEND_API_KEY && !process.env.AWS_SES_REGION) {
  console.warn('[diwali-email-sequence] No email provider — skipping')
  return
}
```

## 3) Landing page variants (3) — `/festival/diwali` A/B/C

The festival landing engine is being built in R-Q4-E-011 (festival calendar). Below are the three variants to be rendered behind a PostHog feature flag `diwali_landing_variant` with 33/33/34 split.

### Variant A — IN-Hindi devotee (default for `lang=hi` or India geo)

- Headline: "अपने घर में दीवाली लक्ष्मी पूजा — सत्यापित पंडित, वीडियो प्रूफ"
- Sub: "नवंबर 8 को दीवाली — 15% प्री-सेल आज खुला"
- Hero image: Indian family in front of decorated home shrine, diyas + rangoli
- Pricing tier table: Basic ₹501 · Premium ₹2,001 · Gold ₹5,001
- Trust strip: "500+ verified pandits · 12 cities · 24hr video proof · 80G receipt"
- CTA: "अभी बुक करें — सीमित स्लॉट" (Book now — limited slots)
- Below-fold: 3 testimonials in Hindi, FAQ in Hindi, founder note

### Variant B — IN-English IT-professional (default for `lang=en` + India geo + URL referrer from tech blogs)

- Headline: "Verified pandit Diwali Lakshmi Puja — 24hr video proof, 80G receipt"
- Sub: "Diwali Nov 8 · 15% pre-sale ends Oct 26 · Pandit-verified across 12 cities"
- Hero: Clean, minimal photo of a Lakshmi murti on a wooden altar — gold + maroon palette
- Pricing tier table: same 3 tiers, INR
- Trust strip: same + "Featured in YourStory, TechCrunch (sample mocks)"
- CTA: "Book Diwali Lakshmi Puja — guaranteed slot"
- Below-fold: comparison vs Sri Mandir + AstroSage (we ship 24hr video; they ship 7-day), FAQ on income tax / 80G mechanics, founder note from Sunil with LinkedIn link

### Variant C — NRI (default for non-India geo OR `lang=en` + currency=USD/GBP/CAD/AUD)

- Headline: "Diwali Lakshmi Puja in your family temple in India — 24hr video proof + 80G"
- Sub: "Sankalp with your gotra + family name · Live video call with pandit · USD/GBP/CAD/AUD pricing"
- Hero: Split-screen — NRI family in San Francisco watching video proof on iPad, family in India at temple altar
- Pricing tier table: $50 / $100 / $200 (auto-flip to GBP/CAD/AUD by geo)
- Trust strip: "Trusted by 1,200+ NRI families across US, UK, Canada, Australia"
- CTA: "Book now — book 48hrs in advance for your timezone"
- Below-fold: timezone calculator (when is your puja in PST/EST/GMT?), 80G mechanics for India-resident parents, founder note + WhatsApp link

### PostHog feature flag

```ts
// apps/web/lib/diwali-variants.ts
import { useFeatureFlagVariantKey } from 'posthog-js/react'

export function useDiwaliLandingVariant(): 'a' | 'b' | 'c' {
  const variant = useFeatureFlagVariantKey('diwali_landing_variant')
  if (variant === 'control' || variant === undefined) {
    // fallback: route by accept-language + geo
    return inferVariantFromGeoAndLang()
  }
  return variant as 'a' | 'b' | 'c'
}
```

PostHog flag config (founder sets in PostHog UI when ready):

```
Flag key: diwali_landing_variant
Distribution: 33% variant 'a' · 33% variant 'b' · 34% variant 'c'
Override conditions:
  - If person property `country` !== 'IN' → force 'c'
  - Else if `language` starts with 'hi' → force 'a'
  - Else → flag distribution
```

## 4) PostHog funnel instrumentation

### Events to capture (paste-ready into web app)

```ts
// apps/web/app/festival/diwali/page.tsx — wire into render
import posthog from 'posthog-js'

useEffect(() => {
  posthog.capture('diwali_landing_viewed', {
    variant: useDiwaliLandingVariant(),
    utm_source: searchParams.get('utm_source'),
    utm_campaign: searchParams.get('utm_campaign'),
    utm_content: searchParams.get('utm_content'),
    utm_term: searchParams.get('utm_term'),
  })
}, [])

// On every "Book Diwali Lakshmi" button
function handleBookClick(pujaSlug: string, tier: string) {
  posthog.capture('diwali_book_clicked', {
    puja_slug: pujaSlug,
    tier,
    variant: useDiwaliLandingVariant(),
  })
  router.push(`/booking/diwali/${pujaSlug}?tier=${tier}`)
}

// In /booking confirmation handler (after Razorpay/Stripe success)
posthog.capture('diwali_paid', {
  puja_slug: pujaSlug,
  tier,
  amount_inr: amount,
  variant: variantFromBooking,
  booking_id: bookingId,
})
```

### Funnel definition (PostHog UI — founder creates after first events fire)

```
Name: Diwali pre-sale funnel
Steps:
  1. Event: diwali_landing_viewed
  2. Event: diwali_book_clicked (within 30 min of step 1)
  3. Event: diwali_paid (within 60 min of step 2)
Break down by: variant (a / b / c)
Filter by date range: 2026-09-24 → 2026-11-15
Conversion goal: ≥ 8% end-to-end (per item KPI)
```

### Variant winner declared after

- Min 2,000 `diwali_landing_viewed` per variant (≈ 6K total)
- Min 5 days running
- Statistical significance ≥ 95% on `diwali_paid / diwali_landing_viewed`
- Winning variant flag is hard-rolled to 100% for last 21 days pre-Diwali

### Tripwire — kill variant if

- CAC > ₹200 (2x target) for ≥ 3 consecutive days → pause variant, reroute traffic to next-best
- Conversion < 4% over 5 days → pause variant, surface to founder

## Founder action checklist (gated)

| Action | Owner | When | Blocks |
|---|---|---|---|
| Razorpay live keys (U1) | founder | before Sep 24 (T-45) | All paid bookings |
| Stripe live keys (U2) | founder | before Sep 24 (T-45) | NRI paid bookings |
| Meta Business Manager — paid ads | founder | before Oct 1 (T-38) | Paid ad spend |
| WA Cloud API setup + 8 template approvals | founder | before Sep 17 (T-52, 7-day Meta review) | WA broadcast |
| Resend or SES API key | founder | before Sep 24 (T-45) | Email drip |
| PostHog `diwali_landing_variant` feature flag created | founder | before Sep 24 (T-45) | A/B/C split |
| Pandit roster confirmed (250 total — 200 cumulative + 50 Diwali extras) | founder | by Oct 15 (T-24) | Capacity ceiling |
| Diwali pre-sale opens email + WA message 2 sent | founder click "send" | Oct 1 09:00 IST (T-38) | Campaign launch |

## Pass criteria (R-Q4-M-008 close)

- [ ] All 8 WA templates submitted to Meta (status pending or approved)
- [ ] All 6 email templates rendered in Resend/SES (status drafts)
- [ ] All 3 landing variants live behind `diwali_landing_variant` PostHog flag
- [ ] PostHog funnel `diwali_landing > book_clicked > paid` shipped with events firing
- [ ] 5,000 pre-bookings closed by Nov 15
- [ ] Blended paid CAC ≤ ₹100
- [ ] End-to-end PostHog funnel ≥ 8%

## Out of scope (handoff to other roadmap items)

- Festival calendar bookable backend → R-Q4-E-011 (cannot pre-sell without this)
- Pandit recruitment to 250 → R-Q4-S-002 supply onboarding
- Razorpay/Stripe live key activation → U1/U2 founder gates
- Capacity overflow plan (over 4K bookings) → `diwali-presale-blitz-spec.md` § Capacity planning

## Status

- Sub-agent deliverables for R-Q4-M-008 shipped as paste-ready spec
- Item status stays `in_progress` until founder ships ad-account access + WA Cloud + sends first T-45 broadcast
- Add `founder-action-required` label on the PR if that label exists in the repo
