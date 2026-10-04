# Mobile v1 scope — what ships in the app, what stays on the web

> Status: **scope decision, not a plan.** Written 2026-08-20 to close PAR-22 (A).
> Measured against the local tree at branch `feat/recurring-razorpay-planid`.
> Companion documents: `docs/mobile-plan.md` (phased build plan, 2026-04-26) and
> `docs/mobile-parity-audit.md` (gap inventory, 2026-05-03). This file supersedes
> neither; it answers the one question they do not: **which gaps are we choosing
> not to close for v1, and why.**

## Why this document exists

PAR-22 was filed as "mobile is far from parity with web". The remediation built
screens. That was necessary and it happened — see *Shipped* below — but the
finding's stated expectation was never a screen count. It was:

> a documented, deliberate scope for v1 mobile

Without that, "parity" is measured against the whole website, and the whole
website will always win. **389 `page.tsx` files** live under `apps/web/app`.
The devotee group in the app has **34 files**. Chasing that ratio is not a
roadmap, it is a treadmill. So this document draws the line instead.

### The rule this document applies

A web surface ships in the app for v1 if it is **something a devotee does
repeatedly, on a phone, in a moment of intent** — darshan, a puja booking, a
donation, a daily panchang, checking what a provider earned. A surface stays on
the web if it is **one-time, desk-shaped, or long-form**: paperwork, org
onboarding, 3,000-word reading, anything with an address form or a document
upload.

Every exclusion below names a reason. An exclusion with no reason is a backlog
item wearing a disguise, and this document is meant to be the opposite of that.

---

## 1. Devotee — the only role with real breadth in v1

**In the app (34 screens under `apps/mobile/app/(devotee)`).** Home + panchang,
darshan list and in-app player, puja catalogue and booking form, temples,
store, donations, astrology (kundli, horoscope), yatra, weddings + muhurat,
gurukuls, messages/inbox, bookings, profile, support, upgrade, and — new with
this change — **search**.

### Search (built, PAR-22 B)

`apps/mobile/app/(devotee)/search.tsx` queries the two public routes:

| Route | Handler | Auth |
|---|---|---|
| `GET /api/v1/temples/search?q&page&limit` | `apps/api/src/routes/temples.ts:127` | none |
| `GET /api/v1/content/search?q&type&language&page&limit` | `apps/api/src/routes/content.ts:47` | none |

Both answer `{ results, total, query, page, limit }` — note `results`, **not**
the `temples` / `content` keys the catalogue selectors read. Selectors live in
`apps/mobile/lib/search.ts`, pinned to each route's `select:` block.

**Pujas are deliberately not searched.** There is no `/pujas/search` route and
the catalogue endpoint takes no `q`. Offering a puja filter in the search box
would recreate exactly the defect PAR-22 was filed for — a control promising
something it cannot do. The empty state says so and points at the Pujas tab.

**This corrects a false claim in the record.** The previous pass relabelled the
home search bar and justified it by asserting no in-app search endpoint existed
and that `apps/web/app/search` was web-only. Both routes above predate that
claim. `apps/web/app/search` is therefore **no longer** on the web-only list.

### Devotee surfaces deliberately left on the web

| Surface | Web | Why it stays on the web for v1 |
|---|---|---|
| Card payment | `apps/web/app/bookings/pay` | The app carries no payment SDK. See §5 — this is the one exclusion that is a **known revenue defect**, not a comfortable choice. |
| ~~Checkout~~ **BUILT 2026-09-02** | `apps/mobile/app/(devotee)/{cart,checkout,orders}.tsx` | No longer excluded. The store purchase path completes in-app via Cash on Delivery against a real `POST /store/orders`, reusing saved addresses from `GET /users/me/addresses` rather than adding an address book. Card/UPI stays disabled with a stated reason: no web page can pay an *existing* `StoreOrder` (`/store/checkout` only pays for an order it just created), so there is nothing to hand off to. `buildCreateBookingBody` still sends `prasadDeliveryRequested: false` — that is the separate PAR-15 gap in §5.2. |
| Long-form devotional reading | `aarti`, `chalisa`, `gita`, `ramayana`, `upanishads`, `vedas`, `shlokas`, `puranas`, and ~30 more | ~37 of the 389 web pages are devotional reading matter. These are SEO surfaces first: they earn their keep on Google, not in a tab bar. Search (above) makes the same corpus reachable in-app by query, which is the phone-shaped version of the same need. |
| Gift + refer | `apps/web/app/gift` (2), `apps/web/app/refer` (1) | Growth surfaces that end in a share sheet. The share sheet is the app; the composer is not worth a screen until referral actually drives installs. |
| Antim Sanskar | `apps/web/app/antim-sanskar` (2) | Booked once, under grief, usually by a family member at a desk, and needs document handling. A phone form is the wrong instrument. |
| Matchmaking | `apps/web/app/matchmaking` (1) | Long profile entry + horoscope upload. Desk-shaped. |
| Credits / pricing | `apps/web/app/credits`, `/pricing` | Reachable from `(devotee)/upgrade.tsx`; a native plan-picker gains nothing over the web page it links to and would duplicate billing copy in two places. |

### Knowledge hub — excluded, and here is the mechanical reason

`apps/mobile/app/(devotee)/knowledge.tsx:22` gates the hub behind
`EXPO_PUBLIC_KNOWLEDGE_ENABLED`, defaulted **false** in
`apps/mobile/.env.example:24`. **It stays off for v1**, and not for want of
content — 120 articles exist on disk (`apps/web/content`: 40 sanskrit, 47 ved,
33 sanatan).

It stays off because **the endpoint cannot serve them in production**:

- `apps/api/src/routes/knowledge.ts:21` resolves the content root to
  `process.env.KNOWLEDGE_CONTENT_DIR ?? path.join(process.cwd(), '..', 'web', 'content')`.
- `KNOWLEDGE_CONTENT_DIR` is set **nowhere** in the repo.
- `apps/api/Dockerfile` copies `apps/api`, `packages`, `tooling`, `docs` — and
  **not** `apps/web`. Runtime `WORKDIR` is `/app/apps/api`, so the fallback
  resolves to `/app/apps/web/content`, which does not exist in the image.
- Therefore `CONTENT_AVAILABLE` is `false` at boot, and the route returns
  `{articles: []}` for a category (`knowledge.ts:75`) and `404 "Knowledge
  content not deployed to this API instance"` for an article (`:92`).

Flipping the flag today would ship an empty hub. **To include it in a later
release, fix the server first** — either add `COPY apps/web/content` to the API
image or set `KNOWLEDGE_CONTENT_DIR` — and verify a non-empty response before
touching the flag. That server-side fix is out of scope for this mobile lane.

> Not verified against production: the prod API
> (`https://api.darshya.online`) returned **HTTP 503 "Service Suspended"** on
> 2026-08-20 for `/knowledge/ved`, `/temples/search` and `/content/search`.
> The reasoning above is read off the Dockerfile and route source, not off a
> live response.

---

## 2. Provider roles — earnings and payouts ship, admin depth does not

Each provider role gets a **working money surface** plus the operational
screens it needs day to day. That was the substance of PAR-22 and it landed.

Route groups are named exactly as they appear on disk under `apps/mobile/app`.

| Route group | Screens in app | Money surface |
|---|---|---|
| `(priest)` | bookings, dashboard, messages, payouts, profile, reviews, services, subscription | `payouts` |
| `(temple)` | bookings, dashboard, donations, messages, payouts, pujas, streams, subscription | `payouts` (TemplePayout revenue-share rail) |
| `(astrologer)` | availability, consultations, dashboard, earnings, messages, payouts, profile, subscription | `earnings` + `payouts` |
| `(wellness)` | dashboard, earnings, messages, profile, sessions, students, subscription | `earnings` |
| `(store-admin)` | dashboard, messages, orders, payouts, products, revenue, reviews | `payouts` + `revenue` |
| `(gaushala)` | cows, dashboard, donations, messages, payouts, profile, volunteers | `payouts` |

Shared implementation: `apps/mobile/lib/provider-payouts.tsx` and
`apps/mobile/lib/payout-gate.ts`. The gate refuses a withdrawal and **says why**
(KYC first, then bank/UPI) rather than showing a dead button.

**Excluded for v1:** bulk operations, CSV export, and multi-entity management
(e.g. a temple chain switching between temples). These are back-office tasks
performed at a desk, and `apps/web/app/org` (4 pages) exists precisely for them.

---

## 3. `(admin)` — deliberately a thin remote control

**8 mobile screens** in `apps/mobile/app/(admin)` (`approvals, commissions,
dashboard, reports, revenue, settings, support, users`) against **24 web admin
pages** under `apps/web/app/admin`.

This gap is **intentional and is not scheduled to close.** The mobile admin app
is for the two things an admin does away from a desk: *approve a thing* and
*check a number*. Everything destructive, bulk, or configuration-shaped stays on
web, where there is a real keyboard and a confirmation dialog worth reading.
Shipping the full admin console on a phone increases the blast radius of a
mis-tap on a production database; that is a bad trade for a solo-operator
product.

---

## 4. Org / partner surfaces — web only, no v1 mobile plan

`apps/web/app/org` (4), `csr-match` (1), `for-temple-chains`, `list-temple`,
`list-gaushala`, `become-*`. These are **B2B acquisition** surfaces: signed once,
by an organisation, usually after an email thread. The app carries the
`(onboard)` group (8 screens) for individual provider self-onboarding, which is
the phone-shaped subset. Organisational onboarding stays on the web.

## 4a. `(auth)` — in scope, and complete

`apps/mobile/app/(auth)` ships `login`, `signup` and `verify-otp`. Sign-in is
not a candidate for exclusion: every surface in §1 and §2 depends on it, and a
sign-in that bounced to the browser would recreate §5.3 on the very first
screen. Password reset stays on the web — it is entered from an email link,
which already opens a browser.

---

## 5. Known defects inside this scope — NOT excuses, and not closed

These are in scope for v1 and are **still broken**. They are listed here so the
scope document cannot be read as declaring them acceptable.

### 5.1 Payment leaves the app (PAR-15, open)

`apps/mobile/app/(devotee)/puja-book.tsx:275` finishes a booking with
`Linking.openURL(resumePaymentUrl(created.id))` → `darshya.online/bookings/pay`.
The devotee is bounced to a mobile browser and must sign in again to enter a
card. `apps/mobile/app/(devotee)/donations.tsx:129` does the same.

The screen is at least **honest** about it today ("Not paid yet… Card payment
happens on the website"), and the booking is saved first, so nothing is lost —
but the core revenue action still exits the app.

> **RESOLVED 2026-09-02.** `react-native-webview@13.12.5` is now a declared
> dependency of `apps/mobile` and `pnpm-lock.yaml` has been regenerated, so the
> `--frozen-lockfile` concern below is discharged — package.json and the lockfile
> must be committed together. `WebViewComp` now resolves, which means
> `darshan-player.tsx` renders in-app instead of always taking the `null` branch,
> and `web-view.tsx` is no longer dead code. Still outstanding: nothing in
> `app/` navigates to `web-view.tsx`, so the generic in-app frame needs call
> sites before it changes any user's experience; and a fresh EAS build is
> required because this is a native module. The original analysis is kept below
> for provenance.

**Blocked, with a specific cause.** Both viable fixes need a WebView or a
payment SDK, and `react-native-webview` was **not installable in this tree
without a lockfile change**:

- It appears in `pnpm-lock.yaml` only as an **optional peer** of `expo@52.0.49`
  (lockfile lines 5464/5470). There is no resolved `react-native-webview@…`
  entry and none in the `apps/mobile` importer.
- `node -e "require.resolve('react-native-webview')"` → `MODULE_NOT_FOUND`.
- CI installs with `pnpm install --frozen-lockfile`
  (`.github/workflows/ci.yml:50`, and the same flag in `e2e.yml`,
  `sentry-release.yml`, and four agent workflows). Adding the dependency to
  `apps/mobile/package.json` **without** regenerating the lockfile fails install
  in every one of those jobs.

Adding it is a one-line `package.json` edit plus a lockfile regeneration; the
regeneration is what makes it a decision rather than a patch, because the
lockfile is shared by every workspace and every CI job.

> This also means `apps/mobile/app/(devotee)/darshan-player.tsx:22-29` — which
> optional-`require`s `react-native-webview` behind a `try/catch` — currently
> always takes the `null` branch outside Expo Go, and HLS/YouTube playback
> silently degrades to "open in browser" in any EAS build.

### 5.2 Prasad delivery is unbookable in-app (PAR-15, open)

`buildCreateBookingBody` in `apps/mobile/lib/booking-flow.ts` always sends
`prasadDeliveryRequested: false`, because the app has no address picker. Same
root cause as the checkout exclusion in §1. Documented in the code.

### 5.3 Session-dropping hand-offs (PAR-22 C, open)

**29 `Linking.openURL` occurrences** exist in `apps/mobile` outside the tests:
**20 real invocations**, plus **9 places the function is passed as a value** to a
helper that calls it, spread across 22 files. They fall into three groups, and
only the first is a defect.

>
> **Recounted after the devotional-library hand-off landed.** 28 / 20 / 8 across
> 21 files became 29 / 20 / 9 across 22 files. The one addition is a VALUE
> reference, not an invocation, and it is in group (b): `(devotee)/library.tsx`
> builds the same `{ push, openExternal: Linking.openURL }` io object
> `(devotee)/astrology.tsx` does and hands it to `openWebHandoff`, so the
> destination is decided by `planWebHandoff` — in-app when the WebView resolves
> and this build's origin matches, the system browser only when it cannot.
> Nothing on that screen bounces out unconditionally.
>
> The screen exists because darshya.online carries ~130 devotional content
> routes whose data is 23,253 lines of hardcoded arrays in `apps/web/lib` with
> no API in front of them. Copying those into the bundle is the drift that made
> wedding prices differ five-fold between web and mobile; opening the live page
> is the only mechanism that cannot drift. Index routes only — never slugs — so
> there is no second list to keep in sync.
>
>
> **Recounted after the provider-portal contract audit.** 29 / 21 / 8 became
> 28 / 20 / 8, across the same 21 files. The one invocation that went away is
> not a hand-off that was converted — it is a hand-off that could never have
> worked. `app/(astrologer)/consultations.tsx` opened the room in two ways: the
> row's own `roomUrl`, or, failing that, the URL returned by
> `POST /astrology/consultations/:id/start-call`. That endpoint mutates
> `astrology.service`'s in-memory `Map`, which holds no row for a real,
> paid consultation, so the second path answered 404 every time. The screen now
> reads `GET /consultation/astrologer/mine`, whose rows carry `jitsiUrl`
> directly, and opens that. One invocation, one file, no behaviour lost.
>

> **Recounted again 2026-09-02, after the mobile-parity route files landed.**
> 25 / 19 / 6 across 19 files became 29 / 21 / 8 across 21 files. The count is
> measured by `lib/__tests__/handoff-census.par22.test.ts`, which fails when this
> paragraph and the tree disagree — that is the point of the test, and it is why
> this figure gets recounted rather than estimated.
>
> **Recounted 2026-09-02.** The previous figures (19 / 16 / 3, across 14 files)
> predate the parity wave that added `(auth)/forgot-password`,
> `(auth)/reset-password`, `(devotee)/settings`, `(devotee)/cart`,
> `(devotee)/checkout`, `(devotee)/orders`, `(devotee)/pandits`,
> `(devotee)/pandit-detail`, `(devotee)/puja-detail`, `(priest)/offers` and
> `(priest)/booking-detail`. The growth is not new bounce-out debt: the added
> invocations are help-centre, privacy/terms and about links, plus one
> "view uploaded video" control on the priest booking detail. The numbers above
> are whatever `handoff-census.par22.test.ts` parses today — if you change a
> hand-off, re-run that test and restate them here rather than guessing.

> **This count is parsed, not grepped, and that changed it.** The figure here
> used to read 23. It was reached with a text search, which counted four
> *comment* mentions — in `pujas.tsx`, `store.tsx`, `yatra-detail.tsx` and
> `booking-flow.ts` — describing bounce-outs that PAR-15, PAR-16 and PAR-18 had
> already **removed**. A text search cannot tell a call from a paragraph about a
> call, which is the same mistake in the same direction as the JSDoc break that
> took `tsc` down in `lib/in-app-web.ts`. `mobile-v1-scope.par22.test.ts` now
> re-derives this number from the tree with the TypeScript parser on every run,
> so it fails instead of rotting.

> Line numbers below were measured on 2026-08-20 and are indicative only —
> several of these files were being edited concurrently by other work in the
> same tree while this was written. Trust the **file** and the **destination**;
> re-grep for `Linking.openURL` before acting on a line number.

**(a) Should become in-app — they drop the session and land on a page that asks
the user to sign in again:**

| Call site | Destination |
|---|---|
| `app/(devotee)/astrology.tsx` (x1, indirect — see below) | the web `/astrology` calculator index |
| `app/(devotee)/temples.tsx:43` | temple detail page |
| `app/(devotee)/donations.tsx:129` | donation payment |
| `app/(devotee)/upgrade.tsx:118` | plan upgrade |
| `app/(devotee)/puja-book.tsx:275` | booking payment (§5.1) |
| `lib/subscription-screen.tsx:70` | subscription management |
| `lib/inbox.tsx:525` | web inbox surface |
| `app/(devotee)/search.tsx:70` | non-live temple + content results (new; inherits the same constraint) |

`astrology.tsx` is the one entry whose **mechanism has already changed**: it no
longer calls `Linking.openURL` itself. The control routes through
`openWebHandoff` in `lib/in-app-web.ts`, passing `Linking.openURL` as the
`openExternal` dependency — which is why the parser counts it as a value
reference rather than an invocation. The destination is unchanged **today**,
because `openWebHandoff` falls back to the browser whenever
`WEBVIEW_AVAILABLE` is false, and it is false in every build produced from this
tree.

It was **x2** until the Vedic calculators moved. The Kundli Milan hand-off is
gone: `packages/shared/src/astrology` now owns the Ashtakoot scorer, the Meeus
moon/Mars longitude series, the Lahiri ayanamsa, the Almanac-for-Computers
sunrise solver and the numerology tables, `apps/web/lib` re-exports them, and
`app/(devotee)/{kundli-milan,numerology,nakshatra-finder,manglik,rahu-kalam}
.tsx` compute them in the app and offline. The reason those tools bounced out
was that the maths sat inside `apps/web/lib` — a fact about a directory, not
about the calculation, and pure functions move. The remaining hand-off covers
the ten tools that did not: sade sati, dasha, hora, shubh muhurat and kaal sarp
(portable, not built yet) and lal kitab, vastu, pitra dosh, pancha pakshi and
baby name (editorial lookups over prose datasets the app would bundle whole).

**The in-app route is written and dormant; only the dependency is missing.**
This entry no longer describes work to do in `apps/mobile`. `lib/in-app-web.ts`
(routing + origin equality + navigation guard), `lib/webview-module.ts` (the
single optional `require`) and `app/(devotee)/web-view.tsx` (the screen, with
its `href:null` tab declaration) all exist and are covered by tests. The
remaining cost is the install itself:

```
npx expo install react-native-webview      # in apps/mobile
```

It touches `apps/mobile/package.json` **and regenerates the root
`pnpm-lock.yaml`**, which every workspace and every `pnpm install
--frozen-lockfile` job shares (`ci.yml:50`, `e2e.yml`, `sentry-release.yml` and
four agent workflows), and a native module additionally needs a fresh EAS build
under the owner's Expo account. Two tests are deliberate tripwires that will go
**red on purpose** the moment it lands, and must be updated in the same change:
`astrology-bounceout-honesty.par22.test.ts` (drop `'react-native-webview'` from
`KNOWN_ABSENT`) and `mobile-v1-scope.par22.test.ts` (the assertion that it is
not a declared dependency). That is them working.

**(b) Correctly external — leave alone.** `mailto:` / `tel:` in
`gurukul-detail.tsx:72,77,83`; Jitsi room URLs in `consultations.tsx:69`,
`(astrologer)/consultations.tsx:60,66` and `inbox.tsx:412` (a video SDK, not a
web page); `support.tsx:103`; `darshan-player.tsx:133` (YouTube fallback).

**(c) Catalogue deep links — this group is now empty.** It used to list
`pujas.tsx`, `store.tsx`, `yatra-detail.tsx` and `booking-flow.ts`. **None of
those four calls `Linking.openURL` any more** — PAR-15, PAR-16 and PAR-18
replaced every one with an in-app flow, and what a grep still finds in them is
a comment recording the behaviour that was removed. They are named here only so
the next reader does not re-add them from a search hit.

### 5.4 `content.tsx` renders hardcoded rows

`apps/mobile/app/(devotee)/content.tsx` still ships a literal `contentData`
array rather than reading the API. That is the PAR-07 fabrication class in a
screen PAR-07 did not sweep. **Not fixed here** — it belongs to the fabrication
finding, not to scope — and it is recorded so the next pass has it in writing.
Note that `/api/v1/content/search` (now wired by §1) proves the data is
reachable.

---

## 6. What "v1 done" means

Mobile v1 is complete when, and only when:

1. Every screen listed in §1 and §2 reads a real endpoint and renders an honest
   empty/error state — **met today**; `apps/mobile` is **600/600 tests green
   across 23 files** with `tsc --noEmit` clean (measured 2026-08-28; the figure
   here previously read 247/247).

   > `tsc --noEmit` was **not** clean when that line was last written, and the
   > suite was not fully green either. `lib/in-app-web.ts` documented
   > react-native-webview's `originWhitelist` internals by pasting the library's
   > two regex literals into a JSDoc block; both end in a star followed by a
   > slash, which closed the comment early and handed the rest of the paragraph
   > to the parser as code. The package emitted 18+ syntax errors and two test
   > files — `in-app-web.par22.test.ts` and `webview-origin-guard.par22.test.ts`,
   > 57 assertions between them — could not be collected at all, so vitest
   > reported them as failed *files* and the assertions silently stopped running.
   > `source-parses.par22.test.ts` now parses every `.ts`/`.tsx` under `lib/` and
   > `app/` with the TypeScript parser so this class cannot return.
2. §5.1 is closed: a devotee can pay for a booking without leaving the app.
3. §5.3 (a) is closed: no signed-in action drops the session into a browser.

Items 2 and 3 share one blocker: a WebView dependency that is not in the
lockfile. Everything else in this document is a **decision**, not a gap.
