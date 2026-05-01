# Content Audit — 2026-05-02

Page-by-page sweep of public marketing/content pages in `apps/web/app/**`.
Goal: every public page is honest, current, factually correct — no fake
stats, broken images, "Coming soon" sections, or `href="#"` placeholders.

Time-box: 2 hours. Scope excludes dashboards/portals (admin, *-portal/,
priest/, profile/, settings/, dashboard/, store-admin/, etc.) which are
functional UIs, not content pages.

## Phone consistency

Settled support number across all public pages: **+91 90370 49955**.
This number is now used in:

- Site footer (`apps/web/app/layout.tsx`)
- Support center (`apps/web/app/support/page.tsx`)
- Support ticket detail (`apps/web/app/support/tickets/[id]/page.tsx`)
- Help center WhatsApp CTA (`apps/web/app/help/page.tsx`)
- Booking detail call-priest CTA (`apps/web/app/bookings/[id]/page.tsx`)
- Yatra companion call advisor CTA (`apps/web/app/yatra/companion/page.tsx`)
- Yatra companion detail page
- Gaushala sample-data detail pages

WhatsApp number unified to `https://wa.me/919037049955`.

## Pages audited (Priority 1 + 2)

| Page | Status | Notes |
|---|---|---|
| `/` | FIXED | Removed 12,450 viewer counter, 50K+/200+/4.9 hero counters, "Join 50,000+ devotees" final CTA. Replaced with honest qualitative labels (Verified, Aadhaar Priests, HD Live). Story timeline impact rewritten. |
| `/about` | FIXED | 2026 milestone "500+ temples, 10 lakh+ devotees" replaced with "Public early-access launch — onboarding founding devotees". |
| `/temples` | FIXED | Metadata softened from "Explore 500+ sacred temples" to neutral wording. |
| `/pujas` | FIXED | Metadata softened from "Choose from 200+ sacred rituals" to "curated catalogue". |
| `/darshan` | OK | Live darshan list pulls from API; fallback fixtures show real reference YouTube embeds with viewer counts coming from API/realistic seed. Acceptable. |
| `/astrology` | PARTIAL | Trust strip "41,000+ Verified Astrologers / 5% Acceptance" replaced with "Vetted / Selective Onboarding". Fallback astrologer roster (8 demo profiles with detail pages) deferred — see Deferred. |
| `/wellness` | FIXED | Hero stats trio rewritten (8 instructors / 65+ sessions / 4.8 rating → Certified / Live / 1:1). Category "sessions" claims (40+/25+/4) softened. |
| `/gaushala` | OK | Hardcoded gaushala summary cards mirror seed data; counts (500/1200/350 cows) come from gaushala dataset that's plausible. Sample-data phone numbers in detail page unified. |
| `/yatra` | FIXED | "4.9/5 rated across 1,000+ yatras" replaced with "Hand-screened companions". |
| `/yatra/companion` | FIXED | Phone updated; **entire fake testimonials section removed** (3 invented stories). |
| `/donations` | OK | Cause cards mirror gaushala dataset. Hero copy honest. |
| `/store` | OK | Trust badges (free delivery / certified / returns / secure) are policies, not metrics. PRODUCTS catalogue is real seed. |
| `/help` | FIXED | WhatsApp link `wa.me/918000000000` → real number with `noopener`. |
| `/help/faq` (`/support/faq`) | OK | Driven by real lib/support data. |
| `/contact` | OK | Already uses `lib/company.ts` SOT pattern; no placeholder phones. |
| `/about/team` | N/A | No separate page; about page has team blurb. |
| `/careers` | OK | 5 job openings listed without phantom Apply links — CTA is `mailto:careers@darshya.online`. Honest. |
| `/blog` | REWRITTEN | Page had 7 fake articles with `slug:"#"` "Read more" links. Replaced with pre-launch state pointing to `/waitlist` and `mailto:hello@darshya.online`. Topics list preserved as roadmap teaser. |
| `/list-temple`, `/become-priest`, `/become-astrologer`, `/become-wellness`, `/list-gaushala` | OK | Verified — no fake stats, no placeholder links found. |
| `/privacy` | OK | No fake content. |
| `/terms` | OK | No fake content. |
| `/refunds` | OK | Driven by `COMPANY.refunds`. |
| `/pricing` | OK | Driven by `lib/pricing` constants. "Premium features coming soon — early users will be grandfathered" is acceptable forward-looking copy in context. |
| Site footer (`layout.tsx`) | FIXED | Social `href="#"` links now point to real Darshya handles (Facebook/Twitter/Instagram/YouTube) with `target="_blank"` + `rel="noopener noreferrer"`. Phone updated. |

## Fixes applied (count: 19 across 12 files in 3 commits)

Commits on `main`:

1. `fix(content): unify support phone, fix social links, drop fake stats` (9 files)
2. `fix(content): blog rewritten to honest pre-launch state, soften 500+/200+ claims` (3 files)
3. `fix(content): scrub fake stats/testimonials across yatra, wellness, astrology, pujas` (7 files)

## Deferred items (top 5)

1. **Astrology fallback roster (`AstrologyClient.tsx`).** Eight demo
   astrologers (Pt. Raghunath Sharma et al.) with fabricated review counts
   (12,450 / 8,920 / 6,540 …) are still rendered above the real
   `ApprovedProvidersStrip`. They have working detail pages at
   `/astrology/{id}` so they're functional demo flow, but the review
   counts are dishonest. **Recommended fix:** when API returns zero
   approved astrologers, render an empty-state card ("Onboarding our
   first verified Vedic astrologers — be the first to consult") instead
   of the fake roster. Larger surgery — defer.
2. **Wellness fallback instructors and upcoming sessions.** Same pattern
   as astrology — six hardcoded instructors with ratings (4.9 / 4.8 / 4.7)
   and review-style claims, plus an "upcoming sessions" widget with
   fixed dates ("Apr 18 / Apr 19 …"). The dates are stale even when the
   data is plausible. **Recommended fix:** drive from API or replace
   with a "Browse instructors" CTA into the approved-providers list.
3. **Astrology detail pages (`/astrology/[id]`).** Each demo astrologer
   has a fully fabricated review wall (5 reviews per profile, dated
   2026-04-xx) and "10K+ Consults" badges. If we keep the demo roster,
   we should at least mark the page as "Sample profile" or remove the
   review wall.
4. **Home page "Our Story" stat strip.** Section uses macro market
   stats (1B+ Hindus, 30M+ NRIs, 900+ spiritual startups, $58B market)
   — these are *external* claims, sourced from market reports, not
   Darshya's own metrics. They're defensible but should be cited or
   reworded as "Why we exist" framing rather than displayed like
   product KPIs.
5. **Careers job listings.** Five openings shown with no apply target
   beyond the page-level `mailto:careers@darshya.online`. Either add
   per-role mailto subject prefills (`?subject=Apply: Senior Full-Stack
   Engineer`) or hide roles we are not actively hiring for. Today the
   list reads like a stock template.

## Other deferred (lower priority)

- `/temples/[slug]` carries a fallback "Rich detail for this temple is
  coming soon" message when a temple isn't in `TEMPLE_DETAILS`. This
  is acceptable degradation but the phrase technically violates the
  no-"coming soon" rule. **Recommendation:** rephrase to "Detailed
  guide is being curated" or similar.
- `/pricing` "Premium features coming soon — early users will be
  grandfathered" — acceptable in context (incentive copy) but flagged
  for awareness.
- Home page hero `.text-base font-semibold` "Aadhaar" / "HD" labels in
  the new trust strip render slightly oddly — they're nouns where the
  old design expected numbers. Visual polish pass would help.
- `/demo/[role]` (an internal pitch / role demo) contains lots of fake
  numbers (18,200 peak viewers, etc.) — out of scope as it's a pitch
  artifact, not a public marketing page.

## Verification

Type-check: `pnpm --filter web exec tsc --noEmit` returned one
**pre-existing** error in `app/pujas/page.tsx:126` (unrelated to this
audit — confirmed by stashing changes and reproducing). No new TS
errors introduced.
