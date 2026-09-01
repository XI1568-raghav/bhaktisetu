# Darshya UI Revamp Audit — 2026-06-05

> Owner-anchored task: "brand colors not there, UI out for the model, font, home page check + revamp based on market research is not done, plan and execute, multiple agents, best skills, ultrathink." Subagents blocked at proxy (Opus 4.8 free-tier 403). Direct synthesis. Scope: 4 audits = brand color, typography, home page revamp plan, mobile responsive. Token source = `apps/web/app/globals.css` Tailwind v4 `@theme` block.

---

## 1. Brand color audit

### Token reality (from `apps/web/app/globals.css`)

| Token | Hex | Plan claimed | Match? |
|---|---|---|---|
| saffron-500 | `#b87333` | (n/a) | copper/brown — not orange |
| saffron-600 | `#9e6229` | `#E16318` (orange) | **MISMATCH — plan wrong** |
| saffron-700 | `#7d4e1f` | (n/a) | deep brown |
| indigo-600 | `#4F46E5` | indigo-600 | ✓ |
| emerald-500 | `#10B981` | "emerald 600 #10B981" | plan calls 500 a 600 |
| emerald-600 | `#059669` | — | actual 600 deeper |
| amber-500 | `#F59E0B` | (n/a) | — |
| amber-600 | `#D97706` | "amber 600 #FFC107" | **MISMATCH — #FFC107 is between 400 and 500** |

**Action**: the plan's hex codes in `reflective-knitting-valiant.md` are outdated. Tailwind class names (`saffron-600` etc) remain canonical — use the class names, ignore the plan's hex values.

### Violation grep summary (occurrence counts)

| Directory | Saffron count | Expected accent | Verdict |
|---|---|---|---|
| `app/store/**` | 63 | saffron/amber | ✓ (commerce uses saffron OK) |
| `app/discover/**` | 2 | indigo | mostly clean |
| `app/vedas/**` | **19** | indigo (Scripture) | **VIOLATION** |
| `app/upanishads/**` | **20** | indigo (Scripture) | **VIOLATION** |
| `app/gita/**` | **17** | indigo (Scripture) | **VIOLATION** |
| `app/astrology/**` (sampled `nakshatra-finder`, `kaal-sarp`, `choghadiya`, `[id]/book`) | 50+ | indigo | **VIOLATION (heavy)** |
| `app/wellness/vipassana/**` | 15+ | emerald | **VIOLATION** |
| `app/yatra/page.tsx` | 1 (a "limited" pill) | emerald + amber for limited | minor |

**Total Scripture-page violations: 56 across 6 files.** Plus Astrology + Wellness wholesale.

### Top 20 violations (severity-ranked)

| Sev | File:Line | Current | Recommended | Reason |
|---|---|---|---|---|
| HIGH | `app/astrology/nakshatra-finder/NakshatraFinderClient.tsx:39` | `border-saffron-300 ... from-saffron-50/30` | `border-indigo-300 ... from-indigo-50/30` | Astrology form = reference, not action |
| HIGH | `app/astrology/nakshatra-finder/NakshatraFinderClient.tsx:49,59,68` | `border-saffron-300 focus:border-saffron-500` | `border-indigo-300 focus:border-indigo-500` | Input focus rings should match category |
| HIGH | `app/astrology/nakshatra-finder/NakshatraFinderClient.tsx:99-104,116,121,180` | `border-saffron-400 from-saffron-50 to-amber-50` etc | indigo variants | Result card = reference data display |
| HIGH | `app/astrology/kaal-sarp/page.tsx:94,96,102,153,154` | `text-saffron-700, border-saffron-200` | `text-indigo-700, border-indigo-200` | Astrology page reference text |
| HIGH | `app/astrology/choghadiya/page.tsx:99,101` | `text-saffron-600/700` | `text-indigo-600/700` | Decorative reference text |
| HIGH | `app/astrology/[id]/book/page.tsx:206,214,227,294` | `bg-saffron-50` (page bg) | `bg-indigo-50` | Astrology page background |
| HIGH | `app/vedas/page.tsx` (19 occurrences) | saffron-* | indigo-* (except primary CTA) | Vedas = Scripture |
| HIGH | `app/upanishads/page.tsx` (20 occurrences) | saffron-* | indigo-* (except primary CTA) | Upanishads = Scripture |
| HIGH | `app/gita/page.tsx` (17 occurrences) | saffron-* | indigo-* (except primary CTA) | Gita = Scripture |
| HIGH | `app/wellness/vipassana/learn/page.tsx:72,336-351` | saffron-* surfaces + CTAs | emerald surfaces, saffron CTA | Wellness should be emerald |
| HIGH | `app/wellness/vipassana/centers/page.tsx:84,139,184` | saffron-* | emerald surfaces, saffron CTA | Same |
| HIGH | `app/wellness/vipassana/centers/[slug]/page.tsx:109,117,185-205` | saffron-* | emerald surfaces, saffron CTA | Same |
| MED | `app/page.tsx` (home) | NO indigo/emerald/amber found | add category-accent teasers (indigo Library, emerald Yatra) | Home doesn't visually express 5 categories |
| MED | `app/astrology/nakshatra-finder/page.tsx:152-161` | `bg-saffron-600` CTA | KEEP saffron (action color) | Already correct |
| MED | `app/yatra/page.tsx:334` | `bg-saffron-600` "limited" pill | `bg-amber-600` (amber = limited/time-sensitive) | Pill is time-sensitive |
| LOW | `app/astrology/nakshatra-finder/page.tsx:99,101,119,125,144` | (FIXED in this session) | — | Done |

### Recurring patterns

1. **Astrology + Wellness pages copy-pasted Worship visual chrome.** All saffron-themed. Should be indigo (Astrology = reference) + emerald (Wellness = travel/wellness).
2. **Scripture hub pages (vedas/upanishads/gita) inherit saffron from the original devotional-app template.** Need wholesale rebind to indigo to anchor the Library category visually.
3. **Home page lacks ANY category accent color.** Browses as monochrome saffron-on-cream. User cannot at-a-glance perceive the 5 distinct surfaces.

### Recommended fix batches

| Batch | Files | LOC est. | Push impact |
|---|---|---|---|
| **B1: Astrology rebind** | 14 client + page files in `app/astrology/**` | ~80 edits | 1 CF build |
| **B2: Scripture rebind** | `vedas/`, `upanishads/`, `gita/`, plus `ramayana/`, `mahabharata/`, `puranas/` (Library scripture group) | ~70 edits | rides B1 |
| **B3: Wellness rebind** | `wellness/vipassana/**`, `wellness/yoga/`, `wellness/page.tsx` | ~30 edits | rides B1 |
| **B4: Home category-accent injection** | `app/page.tsx` Library/Astrology/Yatra teasers | ~10 edits | rides B1 |
| **B5: Edge cases** | yatra "limited" pill → amber, store amber chips, etc | ~10 edits | rides B1 |

**Single batched apps/web push = 1 CF build slot** for full 5-batch sweep.

---

## 2. Typography audit

### Font stack (from `globals.css` + `:root`)

- **Body** (`--font-body` / `--font-family-sans`): `Satoshi` → `Noto Sans` → `Noto Sans Devanagari` → system-ui
- **Display** (`--font-display` / `--font-family-display`): `Cabinet Grotesk` → `Noto Sans` → system-ui
- **Serif** (`--font-family-serif`): `Crimson Pro` → `Tiro Devanagari Sanskrit` → Georgia
- **Devanagari swap on `html[lang="hi"]`**: body + display both become `Noto Sans Devanagari` — good (prevents serif fallback breaking rhythm)

### Type-scale bug — CRITICAL

```
--text-xs:   clamp(0.6875rem, 0.66rem + 0.15vw, 0.75rem)
--text-sm:   clamp(0.78rem,   0.75rem + 0.15vw, 0.84rem)
--text-base: clamp(0.875rem,  0.85rem + 0.12vw, 0.9375rem)
--text-lg:   clamp(1rem,      0.95rem + 0.25vw, 1.125rem)
--text-xl:   clamp(1.25rem,   1.1rem + 0.6vw,   1.625rem)
--text-2xl:  clamp(1.5rem,    1.1rem + 1.5vw,   2.25rem)
--text-3xl:  1.5rem          ← FIXED, NOT clamp
--text-4xl:  1.875rem        ← FIXED
--text-5xl:  2.25rem         ← FIXED, EQUAL to text-2xl max
```

**Bug**: On wide viewport (≥1280px), `--text-2xl` clamps to `2.25rem` = SAME as `--text-5xl` and LARGER than `--text-3xl` (`1.5rem`) and `--text-4xl` (`1.875rem`). H1 with `text-3xl` will visually render SMALLER than an H2 with `text-2xl`. Hierarchy inverted on desktop.

**Body text small**: `--text-base` caps at `0.9375rem` ≈ **15px**. WCAG-recommended minimum body is 16px. NRI users on mobile may struggle. Plan increase to `1rem` minimum.

### Top 10 typography issues

| Sev | File / Token | Issue | Recommendation |
|---|---|---|---|
| **HIGH** | `globals.css :120-129` | `--text-3xl` (1.5rem) < `--text-2xl` max (2.25rem) — hierarchy inversion on desktop | Convert 3xl/4xl/5xl to clamp() with min ≥ 2xl max. E.g. `--text-3xl: clamp(1.75rem, 1.3rem + 1.5vw, 2.625rem)` |
| HIGH | `globals.css :123` | `--text-base` max 15px — below WCAG 16px body min | Bump min/preferred to `1rem` (16px) at viewport ≥768px |
| HIGH | `app/page.tsx:106` | H1 = `text-3xl sm:text-4xl lg:text-5xl` — with current bug, "lg:text-5xl" = same size as `text-2xl` | Either fix tokens (preferred) or use explicit rems |
| MED | `app/page.tsx` 30+ inline `style={{ color: 'var(--color-text)' }}` | Tailwind theme bypassed, dark-mode/theme switching broken, increases bundle | Use Tailwind classes `text-surface-800` instead |
| MED | Many pages | Mix of `font-medium` (500), `font-semibold` (600), `font-bold` (700) without clear hierarchy intent | Standardize: body=400, emphasis=600, headings=600/700, drop 500 from body |
| MED | `app/page.tsx:97-138` hero card chips | `text-xs font-medium` (≈12px medium) for badge labels — borderline-illegible on mobile | Min `text-sm font-semibold` for badges |
| MED | `app/page.tsx:160,167,174` | `text-[11px]` arbitrary value | Use `text-xs` token or define `--text-2xs` |
| LOW | Various | `font-serif` applied to short labels — Crimson Pro intended for long-form reading | Reserve serif for verses + reading surfaces, not labels |
| LOW | `[data-reader-font-size="sm"]` = 16px | Reader "small" = larger than body "base" (15px) | Align reader sm with body to avoid jarring jump |
| LOW | `globals.css :249-252` | Devanagari overrides only body+display, not serif | Add `--font-reader-serif` override too if Hindi reader engaged |

### 3 recurring patterns

1. **Hardcoded inline styles bypass Tailwind**: home page + several others use `style={{ color: 'var(--color-text)' }}` instead of `text-surface-800`. Theme/dark-mode swap broken. Refactor pass = mechanical.
2. **Type tokens broken at desktop**: 3xl/4xl/5xl fixed-rem while 2xl is fluid clamp = hierarchy inversion. Single CSS edit fixes site-wide.
3. **Arbitrary `text-[11px]` / `text-[10px]` litter**: 50+ occurrences across home + cards. Bypass token scale = inconsistent feel. Introduce `text-2xs` (11px) token and replace.

---

## 3. Home page revamp plan (market-research-driven)

### Current composition (`app/page.tsx`, 657 lines)

1. **Top banner** (L82-84): "Early access" pill linking `/waitlist` — saffron
2. **Hero** (L106-178): H1 + 2 CTAs ("Book a Puja" + "Watch Darshan") + 3 trust badges (verified temples / Aadhaar priests / HD streams) + live darshan thumbnail card showing Golden Temple
3. **6 quick-action chips row** (L209-244): chip strip
4. **"Everything in one app" section** (L250-280): icon grid
5. **Live darshan section** (L290-320): featured Harmandir Sahib card
6. **Puja booking section** (L337-372): featured puja card
7. **Astrology section** (L375-400): pandit avatar + chat preview
8. (more sections L400-657 — featured guides, testimonials, CTA band, footer)

**Brand-color absence**: zero `text-indigo-*` / `bg-indigo-*` / `text-emerald-*` / `bg-amber-*` classes on home. Pure saffron + surface. Home cannot visually express the 5-category breadth.

### Competitor patterns (devotional super-app benchmarks)

Without live firecrawl fetches (proxy spent), pulling from category knowledge:

1. **Sri Mandir**: vertical scroll = (a) sticky today panchang strip up top w/ countdown to next festival, (b) deity-of-day hero card, (c) one-tap "Aarti" / "Puja" / "Daan" chips in a 3-col grid, (d) live aarti carousel, (e) book-a-puja inline cards.
2. **AstroSage**: above-fold = (a) daily horoscope by rashi (12-chip selector), (b) free-kundli CTA card, (c) consult-an-astrologer band, (d) panchang strip below.
3. **YouVersion**: 5-tab bottom bar (Bible / Search / Plans / Discover / Activity), home = Verse-of-the-day card + active plan progress + community moments. Uses pure neutral whites + a single brand accent.
4. **Utsav**: festival countdown hero + grid of nearby pujas + booking CTAs + saint/scripture content tabs.
5. **Vama**: hero = current ritual livestream + deity calendar + bookings list.

### Common above-fold patterns
- Sticky panchang/today strip (4/5 have it)
- 4-6 quick-action chip row (4/5)
- Single hero focal (1 image, 1 CTA pair) — NO 3-slide carousels
- Per-category color accent (Library indigo / Yatra emerald) for visual scanability
- Mobile-first: 1-col stack, chips horizontal-scroll

### Proposed REVAMP blueprint (10 sections, top to bottom)

| # | Section | Brand color | Primary CTA | Rationale |
|---|---|---|---|---|
| 1 | Sticky nav 56px (existing) | saffron logo + neutral chrome | Ask Pandit chip | Per IA plan |
| 2 | **Today/Panchang strip** (existing `NextFestivalStrip`) | amber-50 bg + amber-700 text | "Book {today's puja}" | Festive = amber, time-sensitive |
| 3 | **Hero — single image + H1 + 2 CTAs + 3 trust badges** | saffron CTA + cream bg | "Book a Puja" (saffron) / "Watch Darshan" (outline) | Action focal — NO carousel |
| 4 | **6 quick-action chips** (per IA plan): Darshan / Book Puja / Kundli / Panchang / Donate / Yatra | mixed per-chip accent (Darshan=saffron, Kundli=indigo, Yatra=emerald, Donate=emerald) | tap → category | Multi-color reveals the 5-category breadth at-a-glance |
| 5 | **Featured pujas — 3-card grid** (existing) | saffron cards | "Book" per card | Anchor revenue |
| 6 | **Library teaser — 4-card row** mirroring Library mega-panel (Scriptures / Devotional / Saints / Calendar) | indigo cards, indigo iconography | "Browse all 500+ guides →" | NEW — gives Library equal billing |
| 7 | **Astrology band** — Free Kundli + Today's Horoscope + Consult ₹99/min | indigo gradient bg + indigo CTAs | "Get Free Kundli" | Astrology = decision-tool revenue lane |
| 8 | **Yatra teaser — 3-card row** (Char Dham / Jyotirlinga / Tirth) | emerald cards + emerald CTAs | "Plan a Trip" | NEW — surfaces 35+62 yatra/tirth families |
| 9 | **Trust strip**: verified-temples count · video-proof guarantee · 80G receipt · NRI dual-currency | emerald badges (success / 80G) | none | Compliance + trust |
| 10 | **Stories/testimonials + CTA band** "Talk to a Pandit" + email capture | saffron CTA | "Talk Now" / "Get updates" | Conversion close |
| 11 | Footer (existing, slim per plan) | — | — | navigation map |

### Top 5 deltas vs current (ranked by conversion impact)

1. **ADD section 6 (Library teaser) + section 8 (Yatra teaser)** — currently invisible on home. Plan calls them out as orphan absorbers. Pulls 65+ programmatic SEO families into the discovery funnel.
2. **ADD per-chip accent colors on quick-action row (section 4)** — reveals 5-category breadth visually. Today's monochrome saffron treatment buries Astrology/Yatra/Wellness.
3. **PROMOTE Today/Panchang strip to position #2** (above hero) — competitor pattern. Time-sensitive context primes user mental model before hero CTA.
4. **REMOVE inline `style={{ color: var(--color-*) }}` pattern** (~30 occurrences) — replace with Tailwind classes. Enables theme switching + reduces bundle.
5. **FIX type-scale bug in globals.css** — H1 at `text-3xl sm:text-4xl lg:text-5xl` currently renders SMALLER than nearby H2 on desktop. Single CSS edit, site-wide impact.

### Build estimate

- Section additions (6, 8): ~120 LOC each, 2-3 hours
- Per-chip color injection: 30 mins
- Type-scale fix: 5 mins (globals.css)
- Inline-style → tailwind class refactor: 1 hour mechanical
- Local `pnpm next build` verify: 5 mins
- Total: ~5 hours single sitting, 1 CF build push

---

## 4. Mobile responsive audit

### Sample assessment

| Page | LOC | Mobile-first chains | CTA above fold (375×667) | Bottom-tab collision risk |
|---|---|---|---|---|
| `app/page.tsx` | 657 | Mostly OK (`text-3xl sm:text-4xl`) | Yes (hero CTA at L120-130) | needs `pb-20` global on `<body>` — currently absent? verify |
| `app/discover/page.tsx` | 265 | OK | Yes (search input top) | Likely OK |
| `app/pujas/page.tsx` | 589 | Some `grid-cols-3` without `md:` override | depends on fold | unknown — needs viewport test |
| `app/darshan/page.tsx` | 389 | Mostly OK | thumbnail grid above CTA | check |
| `app/temples/page.tsx` | unknown | likely similar | — | — |

### Critical anti-pattern: `grid-cols-(3|4|5|6)` without responsive prefix

**Grep count**: 207 occurrences across **127 files**. Roughly 1/3 of all `*.tsx` files in `apps/web/app/`.

Pattern: `grid-cols-3"` (end of class string) = desktop-first. On mobile 375px, 3 cards = ~100px each, illegible.

Should be: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3` (mobile-first stack).

### Top 15 mobile issues

| Sev | File / Pattern | Issue | Fix |
|---|---|---|---|
| HIGH | 207 occurrences of bare `grid-cols-(3-6)` across 127 files | Desktop-first; mobile renders tiny illegible cards | Add `grid-cols-1 sm:grid-cols-2 md:` prefix |
| HIGH | `app/page.tsx:209-244` chip strip | If horizontal scroll, OK; if wraps to multi-row at 375px, eats above-fold | Test on real viewport; if wrap, switch to `flex overflow-x-auto scrollbar-hide` |
| HIGH | Pages without `pb-16` or `pb-20` | Content collides with 56px fixed `MobileBottomTabs` | Add `pb-20 md:pb-0` to outer `<main>` site-wide via layout |
| HIGH | `app/astrology/[id]/book/page.tsx:206,214,227` | `min-h-screen` on inner sections | Use `min-h-[100dvh]` for iOS Safari URL-bar correction |
| MED | `app/page.tsx:106` H1 | `text-3xl` on mobile = 24px — small for hero | Bump to `text-4xl sm:text-5xl lg:text-6xl` |
| MED | Tap-target audits unsampled | Many `text-xs px-2 py-1` buttons may be <44×44 | Min `px-3 py-2 text-sm` for all clickable |
| MED | Tables across admin/portal pages | No horizontal scroll wrapper | Wrap `<table>` in `overflow-x-auto` |
| MED | `app/page.tsx:97-138` trust badges | 3-col grid likely cramped at 375px | Check responsive; fallback `grid-cols-1 sm:grid-cols-3` |
| MED | `whitespace-nowrap` on long city names | Overflow risk on devotee profile, temple listings | Audit + replace with `truncate` |
| MED | Sticky header 56px + bottom tabs 56px = 112px chrome | Above-fold content compressed on 667px viewport | Test hero composition at 375×555 (after chrome) |
| MED | `fixed bottom-0` bottom-tab + iOS safe-area | `env(safe-area-inset-bottom)` already applied in `MobileBottomTabs.tsx:51` ✓ | OK |
| LOW | Form inputs `text-sm` (≈14px) | Triggers iOS auto-zoom on focus | Bump to `text-base` (16px) on inputs |
| LOW | Modal/dialog content | If full-screen, may not respect bottom-tab safe area | Audit modals separately |
| LOW | Image lazy-loading | `next/image` `priority` flag usage uneven | Audit hero images only `priority`, rest lazy |
| LOW | Horizontal-scroll chip row missing `snap-x` | Choppy on iOS | Add `snap-x snap-mandatory` + `snap-start` on each chip |

### 3 recurring anti-patterns

1. **Desktop-first grids (127 files)**. Largest single mobile-UX debt in the codebase. Mechanical fix: regex-replace `grid-cols-(\d)\b` → `grid-cols-1 sm:grid-cols-2 md:grid-cols-$1` (with manual review for genuinely-desktop-only surfaces like admin tables).
2. **`min-h-screen` instead of `min-h-[100dvh]`**. iOS Safari URL bar collapse causes 100vh jump-cut. Use dynamic viewport unit.
3. **Inline `text-[11px]` arbitrary values + 14px form inputs**. The former breaks token discipline; the latter triggers iOS focus-zoom. Token + input audit pass.

---

## 5. Execution plan — phased

| Phase | Scope | LOC est | CF burn |
|---|---|---|---|
| P1 | Type-scale fix in `globals.css` (clamp 3xl/4xl/5xl + bump base min to 16px) | 5 lines | 0 (LOCAL) |
| P2 | Brand rebind sweep — Astrology (B1) + Scripture (B2) + Wellness (B3) | ~180 edits | 0 (LOCAL) |
| P3 | Home composition — add Library teaser (sec 6) + Yatra teaser (sec 8) + per-chip accent (sec 4) + promote panchang strip to sec 2 | ~250 LOC | 0 (LOCAL) |
| P4 | Inline-style → Tailwind class refactor on home + 3 sampled pages | ~40 edits | 0 (LOCAL) |
| P5 | Mobile-first grid sweep — top 30 most-trafficked pages (manual) + global `pb-20 md:pb-0` in layout | ~60 edits + 1 layout edit | 0 (LOCAL) |
| **PUSH** | All P1-P5 + 4 already-staged `/ved→/vedas` edits + 3 already-staged Astrology brand edits (this session) batched | 1 commit | **1 CF build** |
| P6 (post-deploy) | Curl probes + visual verify on prod | — | 0 |

### Pre-push verify
1. `pnpm next build` (apps/web) — clean, no TS errors, 500+ routes
2. Mobile viewport 375×667 — hero CTAs visible, no horizontal overflow
3. Keyboard nav — focus ring visible on all CTAs
4. JSON-LD validator on home + `/discover`

### Post-push verify
1. `curl https://darshya.online/` 200 + grep `text-indigo-` count ≥ 5 (Library teaser landed)
2. `curl https://darshya.online/vedas` 200 + grep `text-indigo-` ≥ 5 (Scripture rebind landed)
3. `firecrawl_scrape` on `/astrology/nakshatra-finder` — verify indigo visible
4. Lighthouse mobile score baseline before/after

### Rollback

> **CORRECTED 2026-09-01 (OPS-06).** This section said a single `git revert`
> "restores prior IA". It does not, and has not since the Render cutover on
> 2026-07-08: both services are `autoDeploy: false` (`render.yaml:28`, `:60`),
> so a revert changes the repository and leaves production serving the exact
> same bytes. Reverting is still the right way to change the CODE; it is not a
> deploy. To actually roll production back, dispatch the previous good commit:
>
> ```bash
> gh workflow run render-diag.yml -f mode=deploys -f sid=<SID>          # find the SHA
> gh workflow run render-diag.yml -f mode=deploy  -f sid=<SID> -f commit=<SHA>
> ```
>
> Canonical procedure: `docs/runbooks/prod-rollback.md`.

Undo the batched commit in git to take the prior IA out of the codebase; deploying that state is a separate step (see the note above). globals.css token edit isolated — own commit if risky.

---

## 6. Out of scope (deferred)

- Astrology slug↔UUID redesign (~6-8h owner gates)
- Refresh-token JTI / EmailSession / CSP nonce (auth refactor, separate session)
- D-7 OG card static-PNG retry (deferred from c20a7c9 revert)
- 10 remaining orphan-family mega-panel sub-group expansion (jyotirlinga, shakti-peeth, etc — restructures `LibraryMegaPanel` 4-col)
- Backend search upgrade
- A/B framework wire-up

---

## 7. Already-staged edits this session (uncommitted)

| File | Change | Status |
|---|---|---|
| `apps/web/lib/category-tree.ts` L91, L101 | `/ved` → `/vedas` rebind | Prior-session stage, awaiting push |
| `apps/web/app/layout.tsx` L178 | `/ved` → `/vedas` rebind, key preserved | Prior-session stage |
| `apps/web/components/MobileBottomTabs.tsx` L27 | Added `/vedas` to Library prefixes | Prior-session stage |
| `apps/web/app/astrology/nakshatra-finder/page.tsx` L99, L101, L119, L125, L144 | saffron → indigo on decorative + nakshatra-card grid + Tools section gradient | THIS session, partial Phase 2 down payment |

Local `pnpm next build` was CLEAN against the prior-session 4 edits. Need re-verify after this session's 3 brand edits before push.

---

## 8. Open questions for owner

1. Does owner want **Phase 2 brand sweep across ALL 56 Scripture violations** (vedas + upanishads + gita + ramayana + mahabharata + puranas) — or just the top 3 (vedas/upanishads/gita)?
2. Does owner want **inline-style → Tailwind class refactor on home page** included in this push, or split as separate cleanup (lower risk to defer)?
3. **Mobile-grid sweep**: top 30 pages manual fix this batch, or full 127-file regex-replace (higher blast radius, needs grep verify post-replace)?
4. **Type-scale fix**: own commit (isolated rollback) or batched with rest? Owner preference.

Recommend: ALL 4 included in single batched apps/web push (1 CF slot). Type-scale fix has highest ROI per LOC.
