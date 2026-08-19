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
| Checkout | `apps/web/app/checkout` (2 pages) | Needs a full address form + saved addresses. The app has no address picker at all, which is also why `buildCreateBookingBody` sends `prasadDeliveryRequested: false` unconditionally (`apps/mobile/lib/booking-flow.ts`). Building it is real work, not a wrapper. |
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

**Blocked, with a specific cause.** Both viable fixes need a WebView or a
payment SDK, and `react-native-webview` is **not installable in this tree
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

**23 `Linking.openURL` call sites** exist in `apps/mobile`. They fall into three
groups, and only the first is a defect.

> Line numbers below were measured on 2026-08-20 and are indicative only —
> several of these files were being edited concurrently by other work in the
> same tree while this was written. Trust the **file** and the **destination**;
> re-grep for `Linking.openURL` before acting on a line number.

**(a) Should become in-app — they drop the session and land on a page that asks
the user to sign in again:**

| Call site | Destination |
|---|---|
| `app/(devotee)/astrology.tsx:205` | hardcoded `https://darshya.online/astrology…` |
| `app/(devotee)/astrology.tsx:240` | hardcoded `https://darshya.online/astrology…` |
| `app/(devotee)/temples.tsx:43` | temple detail page |
| `app/(devotee)/donations.tsx:129` | donation payment |
| `app/(devotee)/upgrade.tsx:118` | plan upgrade |
| `app/(devotee)/puja-book.tsx:275` | booking payment (§5.1) |
| `lib/subscription-screen.tsx:70` | subscription management |
| `lib/inbox.tsx:525` | web inbox surface |
| `app/(devotee)/search.tsx:70` | non-live temple + content results (new; inherits the same constraint) |

**Blocked on the same missing dependency as §5.1** — the fix is one shared
in-app browser route mirroring the optional-require guard already at
`darshan-player.tsx:22-29`, and that guard is exactly what cannot be relied on
until `react-native-webview` is a real dependency.

**(b) Correctly external — leave alone.** `mailto:` / `tel:` in
`gurukul-detail.tsx:72,77,83`; Jitsi room URLs in `consultations.tsx:69`,
`(astrologer)/consultations.tsx:60,66` and `inbox.tsx:412` (a video SDK, not a
web page); `support.tsx:103`; `darshan-player.tsx:133` (YouTube fallback).

**(c) Catalogue deep links** — `pujas.tsx:74`, `store.tsx:31`,
`yatra-detail.tsx:54`, `booking-flow.ts:7`. Lower priority: these open public
pages where losing the session costs nothing.

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
   empty/error state — **met today**; `apps/mobile` is 247/247 tests green with
   `tsc --noEmit` clean.
2. §5.1 is closed: a devotee can pay for a booking without leaving the app.
3. §5.3 (a) is closed: no signed-in action drops the session into a browser.

Items 2 and 3 share one blocker: a WebView dependency that is not in the
lockfile. Everything else in this document is a **decision**, not a gap.
