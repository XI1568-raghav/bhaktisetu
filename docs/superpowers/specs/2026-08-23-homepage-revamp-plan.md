# Homepage Revamp — Plan (2026-08-23)

> Status: **PHASE 2 BUILT AND VERIFIED 2026-08-24. NOT DEPLOYED** (Render suspended).
> The six questions at the bottom were answered on 2026-08-23 — see "SHIPPED" at the
> end of this file for the decisions taken and what actually changed.
> Phases 0, 1 and 3 are still open; Phase 3 is the highest-value work here.
> Presentation copy: https://claude.ai/code/artifact/ad4fefe8-890e-4a8d-9e81-d34cbe626cc1
> This is the first formal homepage spec in `docs/superpowers/specs/`.

Built from a 12-lane research sweep (5 read-only codebase scouts + 7 competitive/technical
web-research lanes) plus an adversarial completeness pass and 4 follow-up lanes.

---

## 0. Stale premises — corrected before planning

Six claims in the original brief no longer hold. **Do not re-plan these as open work.**

| Brief said | Reality | Evidence |
|---|---|---|
| Two competing hero CTAs | **FIXED 2026-08-12** (CM-13/CM-14). One primary + text link, regression-locked | `app/page.tsx:146-163`, `__tests__/funnel-recovery-and-entry.test.tsx:53-71` |
| 502/517 aarti+chalisa book-links 404 | **FIXED.** 9 route files import `resolveContentPujas`+`getCatalogueSlugs` incl. aarti/chalisa. The 2026-08-20 delta doc is stale | `lib/puja-link.ts`, `app/aarti/[slug]/page.tsx:8-13` |
| 5.58 MB hotlinked images, 11–15 MB pages | **FIXED.** Homepage 14,815 KB → **777 KB** (−94%). The 5.58 MB is `/pujas`, not home | `docs/audit/triage-2026-08-15.md:31-72` |
| Muhurat engine not wired to web | **WRONG — it IS wired.** Just mis-parameterised | `app/pujas/book/page.tsx:754,1790-1799` |
| Search doesn't cover bookable inventory | **PARTLY.** Static index is encyclopedia-only, but `/search` federates `GET /search` (temples/pujas/products) | `app/search/SearchClient.tsx:110,126` |
| 75% temples unbookable | **CONFIRMED — 15 of 20.** Determined by existence of a `temple_puja_offering` row | `prisma/seed.ts:1015-1036` |

### Not in the brief, but load-bearing

- **Store is a hard 400** — catalogue serves `prod_001` ids, `POST /store/orders` only accepts UUIDs, 0 `StoreProduct` rows.
- **NRI Premium ₹5,000/yr withdrawn server-side** — all 6 benefits `enforcedBy: null`. ₹199/mo exists only as FAQ copy.
- **9–10× NRI multiplier NOT charged** — `booking.service.ts:509-538` sets `pujaPrice = basePrice` with a 29-line rationale.
- **80G is OFF** — `HAS_80G_VERIFIED: false`, `pan: null`. 34 of 50 files mentioning 80G don't gate on it.
- **"Live video proof" is false** — proof is a recording uploaded after completion.
- **3 dead motion imports** — `TextReveal`/`ScrambleReveal`/`StickyHeadlinePin` imported at `page.tsx:28,30,31`, never rendered. Only `ParallaxLayer` renders.
- **`/panchang` has ZERO commercial CTAs across 603 lines** — the plan turns on this.
- **PROD IS 503** since 2026-08-17 (Render billing). Re-verified 2026-08-23, incl. `/robots.txt`.

---

## 1. Strategic call

**The homepage is not the highest-value surface. `/panchang` and `/today` are.**

- The audit ranks "fix the homepage" **6th of 9** conversion priorities.
- Strangers land on the 1,000+ encyclopedia pages; the homepage ranks for brand.
- Sri Mandir (verified by DOM parse) puts **zero** in-body commerce CTAs on chalisa/aarti/festival
  articles, but puts three paid puja cards under the panchang table. They monetise the **dated**
  surface, not the evergreen one. Darshya owns two dated surfaces and monetises neither.

**Homepage's actual job:** prove Darshya is not a scam, and route to the current occasion.
The category's dominant buyer fear is impersonation (TTD removed 259+ fake sites; MHA I4C
advisory Apr 2025). Order: (1) identity/verifiability, (2) current occasion, (3) trust furniture once.

**Supersedes:** `docs/ui-revamp-audit-2026-06-05.md` §3 (11 sections, two co-equal CTAs,
testimonials band — contradicts CM-13 and the anti-fabrication doctrine).

---

## 2. Section spec — 24 → 8

**HARD CONSTRAINT:** CI ratchet caps `app/page.tsx` at **14 `<section>`** and it sits at exactly 14,
zero headroom (`__tests__/home-below-fold-budget.home01.test.ts:95-112`). The regex only reads
`page.tsx` — 11 more sections live in `components/home/*` and are invisible to it. Moving a section
into a component buys ratchet headroom without reducing anything. Count the true 24.
Second test: exactly **one** React-emitted image preload; every below-fold text-only strip carries `.defer-paint`.

### Keep (8)
1. **Hero** — rewrite H1, keep `HomeHeroCta`, today's tithi chip. → `/pujas`
2. **What you actually get** — 5 true single-sourced rows (new; replaces both trust surfaces)
3. **This week** — dated board, live countdown, real bookable slugs (new)
4. **What you can book** — 10 real SKUs, renamed by life problem
5. **The people** — every real astrologer/priest named + photographed (new)
6. **Seva** — ₹51/day gau seva; **all 80G claims stripped**
7. **The library** — routes to 1,000+ pages, explicitly not selling
8. **Who runs this** — founder identity, one official domain, working number (new)

### Delete
| Cut | Weight | Reason |
|---|---|---|
| ShopStrip + store showcase | 88.2 KB | Store 400s on every checkout |
| YatraStrip + yatra teaser | 217.5 KB | Heaviest image payload; lead form, no gateway; `/yatra/companion` sells 12 non-existent escorts |
| 3 duplicate Live Darshan blocks | 184.6 KB | Merchandised 4× (y=629/1504/1865/4543) |
| Final CTA "Get Started"→`/auth/login` | — | Second filled primary; residual half of the two-CTA problem |
| "What we offer" grid | 0 KB | Duplicates the category strip above it |
| Quick-actions 6-chip row | 0 KB | Six low-intent choices at a narrowing point |
| "More features" 4-card row | — | Feature inventory, not an offer |
| AI Pandit chat mockup | — | Fold into library as a link |
| Category colour strip | — | Header already has the same 5 mega-menus |
| Email capture waitlist | — | Replace with WhatsApp "remind me before next tithi" (DPDP-clean, purpose-scoped) |
| 3 dead motion imports | — | `page.tsx:28,30,31` |
| "80G Receipts" card | — | `page.tsx:352` — false tax claim |
| "Manager-signed, on-site audit" | — | `page.tsx:350` — `Temple` model has no such column |

Deleting YatraStrip + duplicate darshan removes ~400 KB of the 836 KB attributed image bytes.

### Two copy changes worth more than the layout
- **H1** — still `"Darshya, your bridge to sacred traditions"` (`lib/i18n/en.json:76-78`); never
  rewritten because i18n was do-not-touch during the fix wave. 2-line JSON edit × 6 locales.
- **SKU naming** — rename by life problem, not ritual (Utsav pattern). Makes 1,000 encyclopedia
  pages intent-matched entry points.

---

## 3. Revenue spine

| Line | Real inventory | State | Homepage |
|---|---|---|---|
| Temple puja | 25 offerings / 5 temples, 10 PujaType | LIVE | **Primary** — hero, dated board, catalogue |
| Donations / gau seva | Real Razorpay, ₹51/day recurring | LIVE | **Secondary** — no supply needed. Strip 80G |
| Astrology | 3 profiles, all offline | THIN | Named-people section; sell as puja checkout add-on |
| At-home pandit | 0 `PriestPujaOffering` | EMPTY | Route to `/checkout/offering`, never `/pujas/home-puja` (mock, 600ms timeout) |
| Wellness | 5 instructors, 0 sessions | EMPTY | **Off homepage** |
| Yatra | No Prisma model | LEAD-GEN | **Off homepage** |
| Store | 0 `StoreProduct` | BROKEN | **Off homepage** |
| Subscriptions | NRI Premium withdrawn | NOT SELLABLE | **Off homepage** (real subs revenue is B2B supply-side) |

**One primary action: Book a puja → `/pujas`.** Justified by inventory — the only complete
`create-order → Razorpay → verify-payment` path with real rows. Change the control in
`HomeHeroCta`, never by hardcoding in `page.tsx` (it's A/B-flagged).

**Missing bottom rung:** Sri Mandir's implied AOV is ~₹550–670 (₹69.6 Cr FY25 ÷ 20–25% take ÷
~52 lakh txns). Utsav's entry is ₹61–₹200 framed as *dakshina*. Darshya has nothing between free
content and a full puja. A sub-₹250 SKU with an instant certificate needs no new supply.

---

## 4. Header / footer

**Header — mostly leave alone.** Already fixed-glass, 5 mega-menus, `GlobalSearch` with `/`
shortcut and focus return, `MobileNavV2` with inert focus trap, `MobileBottomTabs` 4 tabs with
Book as raised FAB.
- **Delete orphans:** `MobileNav.tsx` (v1), `MoreDropdown.tsx`, and `layout.tsx`'s dead
  `primaryLinks`/`moreLinks` consts — all defined, imported nowhere.
- **Language switcher lives only in the footer** while 5 non-English homepages are 23%-size stubs
  declaring `lang="en"`. Surface it or stop advertising six languages (HN-04).

**Footer**
- **Demote `/blog`** — 1 post; second source permanently 404s (private repo); page says "Updated daily".
- **Keep help/FAQ** — real: 14 help slugs, 33 support Q&A, 19 FAQs with `FAQPage` JSON-LD.
- **Fix `/contact` duplicate** (Company + Support columns).
- **Add statutory identity block** — E-Commerce Rules 2020 already require named grievance officer,
  48h acknowledgement, 30-day resolution. No competitor surfaces it.
- Keep the 49-link SEO block collapsed and in-DOM (deliberate).

---

## 5. Scroll + motion

Baseline: **403,750 B raw / 121,861 B gz** first-load JS, 8 chunks. `page.tsx` is a Server Component.

| Technique | gz | vs baseline | Thread | Verdict |
|---|---|---|---|---|
| CSS scroll-driven (`animation-timeline: view()`) | **315 B** (0 JS) | +0.0% | Compositor | **SHIP** |
| IntersectionObserver + CSS (already shipped) | 536 B | +0.4% | Negligible | **KEEP** |
| Lenis | 5,423 B | +4.4% | Main rAF | REJECT |
| Motion `m`+`domAnimation`+`scroll` | 26,865 B | +22.0% | Mixed | DEFER |
| GSAP + ScrollTrigger | 46,243 B | +38.0% | Main rAF | REJECT |
| framer-motion full | 62,902 B | +51.6% | Mixed | REJECT |

CSS SDA is 85.43% global, and **Firefox — the one holdout — is absent from Statcounter's India
mobile list** (Chrome 87.85 / Opera 4.74 / Safari 4.29 / UC 1.73). Safari 26.0 shipped it; 26.4 made
it compositor-threaded. Non-supporting tail degrades to "content visible", the correct fallback.

**Rules**
- **NEVER fade in the hero.** LCP excludes `opacity: 0` elements. Hero paints full-opacity frame 1.
- **Only `transform` and `opacity`** in scroll keyframes.
- **Gate the PIN, not just the animation** — `@supports (animation-timeline: view())` must wrap
  `position: sticky` too, or non-supporting browsers get a screen that sticks and never advances.
- **Keep `ScrollReveal.tsx`.** Ships, tested, self-unobserving observers, passive rAF-throttled
  scroll, reduced-motion handled globally at `globals.css:896-909`.
- **No Lenis / no scroll-hijack** — NN/g: majority disoriented, mobile worse, "avoid on mobile".
  Lenis caps at 30fps in iOS low-power mode.
- **Never ship the scroll-timeline polyfill** — 16.7 KB gz to polyfill 315 B of CSS.
- Reveal durations 200–450ms.

`components/motion/ScrollDiscover.tsx.foreign` is a complete working 300-line 5-panel diorama with
hydration-safe mount + reduced-motion fallback. `.foreign` is a manual "disable without deleting".
One-line revival if a showpiece is wanted — hold until the page converts.

---

## 6. Trust without social proof

The market leader doesn't run on per-item reviews either. Astrotalk serves an astrologer whose own
profile JSON says `"orders": 0` to the listing as `"orders": "500+"`. Honest zero is survivable.

### TRUE-AND-SHOWABLE (all single-sourced with drift tests)
| Claim | Source |
|---|---|
| Cancellation ladder | `lib/cancellation-policy.ts:52-56` — **render from module, never retype** |
| Video-proof enforcement | `routes/bookings.ts:276-314` + `payment.service.ts:1905-1909` |
| Fee disclosure | `lib/puja-pricing.ts:50-54` |
| Razorpay signature verification | `payment.service.ts:753-763` (timing-safe HMAC, fails closed) |
| Pandit KYC honesty sentence | `lib/faqs.ts:86` (verbatim, already shipping) |
| Completion count | `lib/social-proof.ts` — real completions only, hides below 3 |

### DO NOT CLAIM (12 items, all contradicted by shipped code)
80G / tax-deductible · "manager-signed" / "on-site audit" · "temple board MoU / 12A-80G check /
site visit" · "Vedic certified" / "vetted pandits" / trust score · "live video proof" · "video proof
guaranteed in 24h" (it's a target) · "automatic full refund if no video" (code explicitly refuses to
automate) · "100% money-back if not satisfied" · any 50%/25% refund tier (unreachable behind the 24h
block) · "200+ temples / 500+ pandits / 1,500+ weddings" · "INR or USD, GBP, AUD, CAD" · "CSR-1 registered".
**8 are one-line deletions in `page.tsx:350-353` and `TrustStrip.tsx:25-33`.**

### Will not build
- **No proof video.** Prod has 0 completed bookings; the "6 videos" figure was a seeded local stack.
  `OWNER-ACTIONS.md`: *"Faking a proof video with stock footage would be far worse than having none."*
  Substitute = "what you receive" strip from real screenshots — **but the 3 that matter (sankalp,
  confirmation, proof row) do not exist and must be captured from the running app.**
- **No fabricated urgency.** CCPA 2023 dark-pattern guidelines; ₹20 lakh already levied. A countdown
  to a real tithi is truthful; "only 3 slots left" is not unless computed from real capacity.
- **No review system that isn't IS 19000:2022-shaped** — purchase-linked, no admin editing, negatives
  within 72h, moderation-criteria page, 180-day removal log, incentive mark.

**Unused asset:** Razorpay Route supports `on_hold`/`on_hold_until` on transfers → *"the priest is not
paid until your video is delivered"* becomes a structural guarantee, not a claim. No competitor offers it.

---

## 7. Sequencing

**Risk, stated bluntly:** a revamped homepage routing into the current estate sends people to a store
that 400s, a yatra page selling 12 non-existent escorts, 17 temple pages with fabricated 5-star
reviews, an astrology page with a hardcoded 12,450-review wall, and 3-of-4 temple links that can't
take money. Driving traffic first amplifies damage.

**Phase 0 (days)**
1. Un-suspend Render. 1,000+ indexed URLs serving 5xx; 503 on `robots.txt` pauses crawling.
2. Fix lying monitors — `health-smoke.mjs:48` `process.exit(0)`, `e2e.yml:32` `continue-on-error: true`.
3. Delete the 12 false claims (independent of the redesign).
4. Record a real test baseline. **"3082" appears nowhere in the repo** — written baselines are 265/265
   and 328/328; there are now 280 test files / ~3,506 assertions. Run once, write it down.

**Phase 1 (a week)**
1. Kill fabricated reviews still live (17 temple pages, wedding, `/astrology`, `/yatra/companion`).
2. Badge unbookable temples + "Notify me when pujas open here" (cheapest demand instrument, unbuilt).
3. Seed offerings for the other 15 temples — content task, highest-leverage inventory fix.
4. Three one-line fixes: add `'pitru-paksha-shraadh' → 'pitru-dosh-nivaran-puja'` alias (puts the
   ₹2,501 SKU on the year's highest-intent shraadh date); route `/today`'s Suggested-puja tile through
   the resolver (hard-404s Sun/Tue/Thu/Sat today); muhurat fetch `days=60` → `days=30`.
5. Add a Durga/Chandi SKU and a Surya/Chhath SKU — Navaratri, Durga Puja and Chhath currently
   resolve to **zero** bookable slugs, in the window the GTM plan calls the year's revenue peak.

**Phase 2** — the homepage (this plan). 2–3 days.

**Phase 3 — the actually-highest-value work**
1. Commerce on `/panchang` + `/today`.
2. Consume `GET /panchang/vrats` — API already computes Ekadashi/Purnima/Amavasya/Sankashti as real
   dates from sidereal Lahiri math. **No web surface consumes it.** ~60 dated occasions/yr, thrown away.
3. Emit Pradosh + Somvar as dates (two pushes into `vrats[]`) — doubles recurring dated inventory and
   lights up 4 SKUs dark for the whole quarter.
4. Re-point `StickyAartiCta` — counts down to 4 hardcoded IST slots, links to `/today` which has no
   aarti section at all. The real per-temple engine (`lib/aarti-schedules.ts`) resolves LIVE-NOW slots
   and is wired only into `/darshan/[id]`. A re-point, not a build.

**Degraded state = current state.** API down → `getCatalogueSlugs()` empty Set →
`resolveBookablePujas()` returns `[]` → festival strip shows "Browse pujas" for Onam; no tithi chip;
trust strip renders its digit-free fallback (which is the untrue "manager-signed" line). Fails closed,
doesn't 404 — good design. **The dated board must look intentional in this state.**

### 90-day dated inventory (2026-08-23 → 2026-11-21)
22 dated events; **13 resolve to ≥1 bookable slug, 9 resolve to none.** But `satyanarayan-katha`
carries **7 of the 13**. Navaratri (10-12), Durga Puja (10-19), Chhath (11-15) all → zero.
Dhanteras (11-06) and Diwali (11-08) both → `lakshmi-puja` cleanly.
4 of 10 SKUs (`maha-mrityunjay-jaap`, `sunderkand-path`, `hanuman-chalisa-path`,
`ram-charit-manas-path`) are named by **no** festival in the entire window.

---

## 8. Measurement

Gate **U8 (`NEXT_PUBLIC_POSTHOG_KEY`) was never done.** Three live experiments
(`hero_copy_v2`, `cta_color_test`, `nri_lane_above_fold`) have plausibly never recorded an exposure;
`hero_copy_v2` needs 100/variant and can never reach it.

**Prerequisites**
- Set the PostHog key in Render.
- Resolve the double-wire — `Analytics.tsx` (`capture_pageview:false`) **and** `PostHogScript`
  (full snippet) both mounted at `layout.tsx:780,783`.
- Decide consent — GA4/PostHog/Meta all mount **outside** `ConsentGate`, which sits badly beside the
  CM-13 cookie-banner delay having been deferred on a DPDP/UK-GDPR judgement.
- Retire or re-seed the 3 experiments — silently dropping the variant components corrupts the
  exposure join. With zero traffic, ship the judgement call.

**Instrument** (unique query param per placement):
`hero_cta_click` · `dated_card_click` (festival slug + puja slug + days-until) ·
**`dated_card_degraded`** (fires on browse-fallback — the honest measure of catalogue coverage,
costs nothing) · `trust_row_expand` · `remind_me_optin` · `section_reach`.

**Metrics that matter** — not homepage conversion. **Article → dated-landing CTR**,
**remind-me opt-ins per 1,000 sessions**, **ratio of bookable to browse-only dated cards** (a supply
metric in a UI costume; it predicts revenue).

---

## 9. Open questions — BLOCKING

| # | Question | Recommendation |
|---|---|---|
| 1 | Hosting: pay Render / move web to Vercel / other | **Pay Render now**, evaluate Vercel calmly. 6 days of 5xx on 1,000+ indexed URLs compounds |
| 2 | ₹51 fee: disclose as line item / fold into one price / one total with split on tap | **One total, split on tap** — keeps CM-03 honest, matches category, makes 20% take a visible trust argument |
| 3 | NRI lane: honest inline card / add dual-clock / activate Razorpay international | **Inline card + dual-clock now**, international as its own project. Sri Mandir gets 10× ARPU with NO USD pricing |
| 4 | Brand colour: code `#9e6229` vs doc `#E16318` | **Code wins**, update the doc. `#E16318` fails AA on white; `cta-contrast.test.ts` locks it |
| 5 | Sankalp-headcount pricing ladder (Individual/Partner/Family/Big Family) | **Yes, as a separate project after the homepage** — bigger prize, but touches `Decimal(10,2)` money math, deserves its own TDD cycle |
| 6 | Founder name + face + WhatsApp on the page | **Name + signed letter + shared support number** — keeps the human signal, hands off later without a page change |

---

## On approval

Build sections 1–8 on a branch against `next dev --turbopack` (plain webpack serves stale chunks).
Show at 390px and 1280px. Every behavioural change ships a test **verified failing first**.
Hold baselines: `tsc` clean + full web suite green at whatever tonight's run records.
**Nothing deploys while Render is suspended.**
Where content doesn't exist (3 screenshots, Durga/Surya SKUs, founder photo) — say so, leave the slot
empty, never hardcode a placeholder that reads as real.

---

## SHIPPED — Phase 2 built and verified 2026-08-24

> Status changed from AWAITING APPROVAL. Founder answered the six questions on
> 2026-08-23; sections 1-8 built against `next dev --turbopack` on localhost:3000.
> **Not deployed** — Render is still suspended (founder: "live next week").

### Founder decisions taken

| # | Question | Answer |
|---|---|---|
| 1 | Hosting | Render stays; live next week. Change nothing |
| 2 | ₹51 fee | **One total, split on tap** — fee folded into the quoted total |
| 3 | NRI lane | Keep honest inline card **+** activate Razorpay international **+** re-open ₹5,000/yr plan |
| 4 | Brand colour | Not asked; taken as code-wins (`#9e6229`). `cta-contrast.test.ts` locks it; `#E16318` fails AA on white. BRAND_GUIDELINES.md flagged for token-sync |
| 5 | Sankalp-headcount pricing | Yes, **as a separate project after** the homepage |
| 6 | Founder identity | Name + signed letter + **shared** support number (not personal WhatsApp) |

**Q3 caveat recorded:** Razorpay international needs founder video-KYC, and
re-opening NRI Premium needs a product decision on which benefit gets a non-null
`enforcedBy`. Neither is homepage work. **No NRI Premium upsell was put on the
homepage** — advertising a plan `getPlans()` filters out would recreate exactly
the class of false claim this revamp deleted.

### What actually changed

`app/page.tsx` — **14 `<section>` → 4**, 45,257 → 25,762 bytes. Ten sections deleted:
store showcase, yatra teaser, 3 duplicate Live Darshan blocks, final-CTA second
primary, category strip, quick actions, what-we-offer, more-features, library teaser.
Also removed: 3 dead motion imports (`TextReveal`/`ScrambleReveal`/`StickyHeadlinePin`
were imported and never rendered) and the `<TrustStrip>` mount.

**New:** `components/home/WhatYouGet.tsx` (5 rows, each derived from a module with a
drift test — never a string literal) and `components/home/ThisWeek.tsx` (dated board,
fail-closed catalogue resolution, `data-bookable` attribute so coverage is measurable
from the DOM).

**12 false claims deleted** across `page.tsx`, `TrustStrip`, `WorshipStrip`,
`HeroCopyVariant`, `NriLaneAbTest` — 80G/tax-deductible, "manager-signed / on-site
audit", "Live video proof".

### Baseline — RECORDED, clean tree, nothing else writing

```
Test Files  305 passed (305)
     Tests  3230 passed (3230)
  Duration  829s
tsc --noEmit  clean
```

**The "3082" in the original brief appears nowhere in the repo.** Prior written
baselines were 265/265 (AUDIT.md) and 328/328 (SESSION-STATE.md). 3230 is the first
recorded full-suite number and includes 30 tests added by this work
(`home-truthful-claims` 17, `home-this-week` 13).

### Tests changed, and why (all deliberate, none weakened)

- `home-below-fold-budget` — section ratchet **14 → 4** with the ten deletions listed
  inline; floor 5 → 3; `DEEP` defer-paint checks became **deletion guards**.
- `home-preload-and-deferral` — stubbed `ThisWeek` (async server component suspends
  under sync `renderToStaticMarkup`, same reason `NextFestivalStrip` was stubbed);
  `ROWS` emptied, replaced by deletion guards.
- `page-chrome-uniformity` — `app/page.tsx` removed from `ADOPTERS` (it owns no CTA
  now); added `HOME_NO_CTA` bespoke-CTA guard so it still can't hand-roll one;
  DU-09 **generalised** from "the Worship row's hexes" to "every hex in page.tsx is a
  declared token" (strictly stronger, section-independent); tap-safe floor 5 → 3.

### Known state on localhost right now

All three dated cards render `data-bookable="false"` → "How to observe it".
That is the fail-closed path working: `getCatalogueSlugs()` returns an empty Set when
the API is unreachable, so nothing emits a dead `/pujas/<slug>`. Onam and Janmashtami
both resolve to `satyanarayan-katha` once the API is up — pinned by `home-this-week`.

### Provenance warning

This work was committed by a **concurrent session** at 21:24 on 2026-08-23 inside
`68caf1d8 "fix: close 8 more findings; 362 of 449"` — swept up by `git add -A`.
It is not separable from that audit wave without a manual cherry-pick.

### Not built, deliberately

- **Founder identity section** — needs a real name, photo and support number. Left out
  rather than placeheld.
- **"What you receive" screenshot strip** — the 3 screenshots that matter (sankalp
  step, booking confirmation, proof row) do not exist in `public/`. Must be captured
  from the running app.
- **WhatsApp "remind me"** replacing EmailCapture — real work, not a copy swap.
- **Phase 1 and Phase 3 entirely** — see the sequencing section above. Phase 3
  (commerce on `/panchang` + `/today`, consuming `GET /panchang/vrats`) remains the
  highest-value work in this document.
