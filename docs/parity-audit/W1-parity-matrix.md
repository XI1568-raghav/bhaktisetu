# W1 — Web ↔ Mobile Parity Matrix (Darshya)

**Audit date:** 2026-09-02
**Scope:** `apps/web/app` (390 `page.tsx` routes) vs `apps/mobile/app` (111 `.tsx` files, Expo Router)
**Status:** COMPLETE

---

## 0. HEADLINE VERDICT (written first, evidence below)

The mobile app is **NOT a shell over the website**. It is a **separate, much smaller native app**.
There is a web-handoff library, but in every shipped build it degrades to *"eject the user into
Chrome/Safari"* — it never renders web content inside the app.

**Consequence:** every web route with no native mobile screen is, from inside the app, either
(a) unreachable entirely, or (b) reachable only by being thrown out to the mobile browser from one
of ~14 hardcoded link sites. There is no generic "open any darshya.online URL in-app" path.

---

## 1. WEB-VIEW REACHABILITY VERDICT (the pivotal question)

### Verdict: **`(devotee)/web-view.tsx` is DEAD CODE IN EVERY SHIPPED BUILD.**

The prior agent's claim — *"nothing in `apps/mobile/app/` ever navigates to web-view"* — is
**correct in effect but wrong in mechanism**. A navigation path to `web-view` DOES exist in source.
It is permanently disabled by a missing native dependency. Both facts matter.

### Evidence chain

**(a) The route constant and the router that targets it exist.**

`apps/mobile/lib/in-app-web.ts:54`
```ts
export const IN_APP_WEB_ROUTE = '/(devotee)/web-view';
```

`apps/mobile/lib/in-app-web.ts:64-76` — `planWebHandoff()` is the *only* decision point:
```ts
export function planWebHandoff(
  target: WebHandoff,
  opts: { webViewAvailable: boolean; origin: string },
): WebHandoffPlan {
  if (opts.webViewAvailable && isRenderableInApp(target.url, opts.origin)) {
    return { kind: 'in-app', pathname: IN_APP_WEB_ROUTE, params: {...} };
  }
  return { kind: 'browser', url: target.url };   // <-- always taken, see (c)
}
```

**(b) Exactly ONE screen calls it.**

`apps/mobile/app/(devotee)/astrology.tsx:16` imports `openWebHandoff, describeWebHandoff`.
Call sites: `astrology.tsx:282` and `astrology.tsx:332`. **No other screen in `apps/mobile/app/`
imports `in-app-web` at all.** (verified: `grep -rn "in-app-web|openWebHandoff|planWebHandoff" apps/mobile/app` returns
only `astrology.tsx` and `web-view.tsx` itself.)

**(c) `webViewAvailable` is `false` in 100% of builds — the dependency is not declared.**

`apps/mobile/lib/webview-module.ts:76-90`
```ts
function probe(): OptionalWebView {
  try { const mod = require('react-native-webview') ... } catch { return null; }
}
export const WebViewComp: OptionalWebView = probe();
export const WEBVIEW_AVAILABLE: boolean = WebViewComp !== null;
```

`apps/mobile/package.json` dependency list (full, verified): `@babel/runtime, @expo/metro-runtime,
@expo/vector-icons, @poojly/api-client, @poojly/shared, @react-navigation/native,
@sentry/react-native, @tanstack/react-query, expo, expo-asset, expo-constants, expo-font,
expo-linking, expo-modules-autolinking, expo-notifications, expo-modules-core, expo-router,
expo-secure-store, expo-status-bar, expo-system-ui, expo-video, react, react-native,
react-native-safe-area-context, react-native-screens`.

**`react-native-webview` is ABSENT.** The `require` throws, `probe()` returns `null`,
`WEBVIEW_AVAILABLE === false`, `planWebHandoff` always returns `{kind:'browser'}`.

The code says so itself — `apps/mobile/app/(devotee)/astrology.tsx:176`:
> "`WEBVIEW_AVAILABLE` is false in every build produced [by this repo]"

**(d) The screen is registered but hidden, and nothing pushes to it.**

`apps/mobile/app/(devotee)/_layout.tsx:156`
```tsx
<Tabs.Screen name="web-view" options={{ href: null, title: 'Darshya' }} />
```
`href: null` = not in the tab bar. The only programmatic push is the `plan.kind === 'in-app'`
branch of `openWebHandoff` (`in-app-web.ts:216-218`), which is unreachable per (c).

**(e) `web-view.tsx` itself falls back to ejecting.**
`apps/mobile/app/(devotee)/web-view.tsx:151` — `Linking.openURL(url)` when there is no frame.

### So how DOES a mobile user reach web-only content?

Only through **hardcoded `Linking.openURL` sites that eject the user into the system browser.**
Census of real invocations in `apps/mobile/app/` (excluding comments/tests):

| File:line | Destination | Reaches web content? |
|---|---|---|
| `(devotee)/astrology.tsx:284,334` | darshya.online astrology / AI chat (via `openWebHandoff` → browser) | YES (web) |
| `(devotee)/temples.tsx:43` | temple **detail** URL on web | YES (web) |
| `(devotee)/search.tsx:70` | search result `dest.url` | YES (web) |
| `(devotee)/store.tsx:31` (historical, now native) | — | no |
| `(devotee)/donations.tsx:130` | donation payment URL | YES (payment) |
| `(devotee)/puja-book.tsx:351` | `resumePaymentUrl(...)` — checkout | YES (payment) |
| `(devotee)/support.tsx:104` | `openHelpCentre(...)` help centre | YES (web) |
| `(devotee)/upgrade.tsx:129-131` | subscription upgrade URL | YES (payment) |
| `(devotee)/gurukul-detail.tsx:72,77,83` | `mailto:` / `tel:` / gurukul's **own** website | not darshya web |
| `(devotee)/consultations.tsx:69`, `(astrologer)/consultations.tsx:61,67`, `(devotee)/darshan-player.tsx:134`, `lib/inbox.tsx:410-412,524-525` | Jitsi room / stream URL | not web content |
| `lib/subscription-screen.tsx:70` | subscription URL | YES (payment) |

**There is no URL-generic escape hatch.** A user cannot type or reach an arbitrary
`darshya.online/...` path from inside the app. The ~8 web-reaching links above are
**hand-wired to specific destinations** (astrology, temple detail, search results, help centre,
and 4 payment flows). The entire devotional-content tail — chalisa, shlokas, vedas, nakshatra,
aarti, puranas, gita, ramayana, mahabharata, festivals, panchang, deity pages — has
**zero link from anywhere in the app.**

**Therefore: web routes without a native mobile screen are GENUINELY UNREACHABLE on mobile.**

---

## 1b. SECONDARY REACHABILITY FINDING — orphaned mobile screens

Even *inside* the native app, several screens are unreachable. The devotee tab bar has only
**5 visible tabs** (`index, pujas, darshan, store, profile` — `_layout.tsx:32-76`); everything
else is `href: null` and must be reached by an explicit `router.push`. Seven devotee screens
are `href: null` **with zero inbound `router.push`/`Link` from anywhere in the app**:

| Orphaned screen | `href:null`? | Inbound refs | Note |
|---|---|---|---|
| `(devotee)/knowledge.tsx` | yes (`_layout.tsx:168`) | **0** | layout comment claims "reached via push" — nothing pushes |
| `(devotee)/astrology.tsx` | yes (`_layout.tsx:100`) | **0** | the *only* consumer of the web-handoff lib |
| `(devotee)/content.tsx` | yes (`_layout.tsx:93`) | **0** | aarti/chalisa/mantra/bhajan audio list |
| `(devotee)/temples.tsx` | yes (`_layout.tsx:86`) | **0** | temple browse |
| `(devotee)/wellness.tsx` | yes (`_layout.tsx:107`) | **0** | 842 LOC |
| `(devotee)/support.tsx` | yes (`_layout.tsx:128`) | **0** (only a code *comment* in `astrology.tsx:31`) | help centre |
| `(devotee)/web-view.tsx` | yes (`_layout.tsx:156`) | **0** | dead per §1 |

**Transitively orphaned** (their only parent is `knowledge.tsx`):
`knowledge-category.tsx`, `knowledge-article.tsx`, `learn-sanskrit.tsx`, `lesson.tsx`, `gurukuls.tsx`.
(`gurukul-detail` / `gurukul-apply` survive via a second parent: `profile.tsx:165` →
`gurukul-portal.tsx` → `gurukul-detail` → `gurukul-apply`.)

That is **12 of 34 devotee screens unreachable in a shipped build.**

## 1c. Deep links do not rescue this

`apps/mobile/lib/deep-link.ts:69-95` maps `darshya.online/*` and `darshya://*` to 7 pathnames.
**Six of the seven do not exist as files:**

| Deep-link target | File exists? |
|---|---|
| `/(devotee)/puja-details` | **NO** |
| `/(devotee)/booking-detail` | **NO** |
| `/(devotee)/consultation` | **NO** (file is `consultations`) |
| `/(devotee)/inbox` | **NO** (file is `messages`) |
| `/(devotee)/order-detail` | **NO** |
| `/(devotee)/today` | **NO** |
| `/(devotee)/home` (the *fallback*) | **NO** (file is `index`) |
| `/(devotee)/darshan-player` | yes |

There is **no `url` case** in the switch — a universal link to any other `darshya.online` path
falls through `default:` to the non-existent `/(devotee)/home`. The file's own header says the
hook is "mounted but inert" pending AASA/assetlinks. Either way, deep linking is not a web-content
reachability path.

---

## 2. CONTENT/SEO TAIL — the key judgement call

### Verdict: **NOT generically covered. The content tail is essentially ABSENT on mobile.**

The three knowledge screens *are* a category/slug router hitting a content API — but the router is
closed over **exactly three hardcoded categories**, and it is switched off in every build.

**Evidence 1 — the category set is a closed 3-member union, not open.**
`apps/mobile/app/(devotee)/knowledge.tsx:8-20`
```ts
interface CategoryCard { key: 'sanskrit' | 'ved' | 'sanatan'; ... }
const categories: CategoryCard[] = [
  { key: 'sanskrit', ... }, { key: 'ved', ... }, { key: 'sanatan', ... },
];
```
`knowledge-category.tsx:21` — `const cat = (category ?? 'sanskrit') as 'sanskrit' | 'ved' | 'sanatan';`

**Evidence 2 — the API agrees and 400s anything else.**
`apps/api/src/routes/knowledge.ts:5` — `type Category = 'sanskrit' | 'ved' | 'sanatan';`
`apps/api/src/routes/knowledge.ts:74` — `if (!isCategory(category)) return reply.code(400).send({ error: 'Invalid category' });`
It is a filesystem MDX reader over `apps/web/content/{sanskrit,ved,sanatan}` (`knowledge.ts:20-23`)
— **120 files** on disk (sanskrit 40, ved 47, sanatan 33). There is no `deity`, `chalisa`,
`shloka`, `nakshatra`, `panchang`, `aarti`, `purana`, `gita`, `ramayana` or `festival` collection
behind it. Passing `?category=chalisa` returns HTTP 400.

**Evidence 3 — it is dark in every shipped build.**
`knowledge.tsx:22` — `const KNOWLEDGE_ENABLED = process.env.EXPO_PUBLIC_KNOWLEDGE_ENABLED === 'true';`
`knowledge.tsx:26-40` — when false, the screen renders a construction icon and
**"Knowledge Hub launching soon."** `EXPO_PUBLIC_KNOWLEDGE_ENABLED` **does not appear in any
`env` block of `apps/mobile/eas.json`** (`preview`, `production`, `testflight` set only
`EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_WEB_URL` / `EXPO_PUBLIC_ENVIRONMENT`). Same for
`EXPO_PUBLIC_GURUKUL_ENABLED` (`knowledge.tsx:23`).

**Evidence 4 — `content.tsx` is an audio list, not an article reader.**
`content.tsx:16` — `type ContentType = 'aarti' | 'chalisa' | 'mantra' | 'bhajan';` — four tabs,
`isAudio: true` rows, a play toggle, and a hardcoded `contentData` fallback used whenever the API
returns nothing (`content.tsx:236-249`). There is **no detail/article screen and no `[slug]` route**.
It cannot render `/chalisa/[slug]`, `/aarti/[slug]`, `/shlokas/[slug]`, etc.

### Net effect on the 130-route content tail

| | count |
|---|---|
| Web content routes | **130** |
| Nominally served by a mobile screen | 10 (`/sanskrit`, `/ved`, `/sanatan` + their `[slug]`; `/content`, `/aarti`, `/chalisa`, `/chants` as audio lists) |
| …of those, gated off by an unset flag | 6 |
| …of those, on an orphaned screen | 4 |
| **Effectively reachable on mobile today** | **0** |
| Genuinely absent (no screen at all) | **120** |

Missing entirely: `deity`, `chalisa/[slug]`, `shlokas`, `vedas`, `nakshatra`, `festivals`,
`festival/[slug]`, `panchang` (+ `karana`, `yoga`, `[city]`), `aarti/[slug]`, `puranas`,
`ramayana`, `mahabharata`, `gita`, `upanishads`, `yoga-sutras`, `darshanas`, `hindu-philosophies`,
`hindu-symbols`, `chakras`, `rashi`, `tithi`, `masa`, `muhurat`, `vrat`, `ekadashi`, `jyotirlinga`,
`shakti-peeth`, `tirth`, `pilgrimage`, `sacred-{rivers,trees,mountains}`, `sapta-{rishis,mathruka}`,
`dashavatar`, `nava-graha`, `navaratna`, `rudraksha`, `samskaras`, `vedic-yajnas`, `pancha-bhoota`,
`ashta-lakshmi`, `aditya`, `bhakti-saint`, `devi/{navadurga,mahavidyas}`, `blog`, `calendar`,
`content/books`, `city/[slug]`, `help/articles`, and all 7 language landings (`hi/bn/mr/ta/te/uk/nri`).

---

## 3. SUMMARY TABLE

Bucketing rule: a route counts as **native mobile** only if a specific Expo Router screen serves
that purpose. **Via browser eject** = no native screen, but some screen calls `Linking.openURL`
to that web page (the user leaves the app). Everything else is **missing**.

| Bucket | Web routes | Native mobile | Via browser eject | Missing | % parity (native) |
|---|---:|---:|---:|---:|---:|
| A. Role portals | 82 | 55 | 0 | 27 | **67%** |
| B. Devotee core | 127 | 35 | 7 | 85 | **28%** |
| C. Auth + onboarding | 20 | 11 | 0 | 9 | **55%** |
| D. Content / SEO tail | 130 | 10 | 0 | 120 | **8%** |
| E. Marketing / legal | 31 | 1 | 0 | 30 | **3%** |
| **TOTAL** | **390** | **112** | **7** | **271** | **28.7%** |

### The same table, corrected for screens that cannot be reached (see 1b / 2)

| Bucket | Web routes | *Effective* native | Removed | Effective % |
|---|---:|---:|---:|---:|
| A. Role portals | 82 | 55 | — | 67% |
| B. Devotee core | 127 | 27 | -8 (orphaned: astrology, temples, wellness x2, support, learn-sanskrit x2, gurukuls) | 21% |
| C. Auth + onboarding | 20 | 11 | — | 55% |
| D. Content / SEO tail | 130 | **0** | -10 (6 flag-gated off, 4 orphaned) | **0%** |
| E. Marketing / legal | 31 | 1 | — | 3% |
| **TOTAL** | **390** | **94** | **-18** | **24.1%** |

Of the 7 browser-eject routes, only 3 (`/bookings/pay`, `/checkout/offering`, `/gift`) sit on a
reachable screen; the other 4 hang off orphaned `astrology.tsx` / `support.tsx` / `temples.tsx`.

## 4. PARITY PERCENTAGES

**Weighting (stated explicitly).** Each bucket is weighted by how much of a *shipped app's* value
it carries. The SEO tail is organic-search surface, not app surface — a devotee who wants a
chalisa search-lands on the web page; they do not open the app for it. Marketing/legal is the same.

| Bucket | Weight | Rationale |
|---|---:|---|
| B. Devotee core | **4** | the product itself — booking, paying, darshan, store |
| C. Auth + onboarding | **4** | a broken auth path blocks 100% of users; supply onboarding blocks GMV |
| A. Role portals | **3** | supply-side operations; providers tolerate web, but mobile is the retention lever |
| D. Content / SEO tail | **1** | organic-search surface; low in-app demand |
| E. Marketing / legal | **1** | pre-install surface; belongs on web |

| Metric | Value |
|---|---|
| **(i) Raw route-count parity** | **112 / 390 = 28.7%** |
| **(ii) Importance-weighted parity** | **(3x55 + 4x35 + 4x11 + 1x10 + 1x1) / (3x82 + 4x127 + 4x20 + 1x130 + 1x31) = 360 / 995 = 36.2%** |
| (iii) Raw, corrected for unreachable screens | 94 / 390 = **24.1%** |
| (iv) Weighted, corrected for unreachable screens | 318 / 995 = **32.0%** |

## 5. PER-ROLE PORTAL TABLE

| Role | Web sub-pages | Mobile screens | Missing on mobile | Extra on mobile |
|---|---:|---:|---|---|
| **Admin** | 24 | 8 | **16** — agents, b2b-onboarding, consultations, kyc, leads, metrics, outreach, payouts, ratings, refunds, roadmap, subscriptions, support/view, users/[id], users/view, waitlist | — |
| **Priest** | 12 | 8 | **4** — bookings/[id], bookings/[id]/accept, bookings/view, offers | — |
| **Temple** | 9 | 8 | **1** — schedule | — |
| **Astrologer** | 7 | 8 | **0** | payouts (web uses shared `/payouts`) |
| **Wellness** | 7 | 7 | **0** | — |
| **Store-admin** | 6 | 7 | **0** | payouts |
| **Gaushala** | 6 | 7 | **0** | payouts |
| **Gurukul** | 2 | 1 | **1** — applications | — |
| *Shared / cross-role* | 9 | (mapped) | **5** — /provider/kyc, /org, /org/accept, /org/members, /org/settings | — |
| **TOTAL** | **82** | **54** | **27** | 3 |

Five of eight portals are at or near full parity. **Admin is the outlier: 8 of 24 pages (33%).**
Priest — the highest-GMV supply role — is missing the entire per-booking accept/decline flow.

## 6. RANKED — WEB ROUTES WITH NO MOBILE PATH (by launch importance)

| # | Route(s) | Why it matters | Sev |
|---:|---|---|---|
| 1 | `/auth/forgot-password`, `/auth/reset-password` | **No password recovery in the app.** A locked-out user has no in-app path back. `(auth)/` has only login, signup, verify-otp. | P0 |
| 2 | `/store/checkout`, `/store/cart` | **Mobile store cannot complete a purchase.** `store.tsx:227-247` renders the cart as an `Alert.alert` text dump; there is no checkout screen. Add-to-cart works, buying does not. | P0 |
| 3 | `/checkout/success`, `/consultation/[id]/success`, `/gift/success` | Payments eject to the browser (`puja-book.tsx:351`, `donations.tsx:130`, `upgrade.tsx:131`) and **never return**. No confirmation surface. | P0 |
| 4 | `/priest/bookings/[id]`, `/priest/bookings/[id]/accept`, `/priest/offers` | Priests cannot view or **accept** a booking on mobile. Supply-side fulfilment blocker. | P0 |
| 5 | `/pandits`, `/pandits/[id]`, `/pujas/pandits/[id]` | No pandit directory or profile — the marketplace's core supply browse surface. | P1 |
| 6 | `/pujas/[slug]` | No puja detail page; the list jumps straight into a booking form. | P1 |
| 7 | `/astrology/[id]`, `/astrology/[id]/book`, `/astrology/astrologers/live` | Cannot browse or book an astrologer natively. `astrology.tsx:264-284` funnels **all 28 astrology tools** into one browser URL (`${WEB.origin}/astrology?...&service=...`) — and that screen is itself orphaned. | P1 |
| 8 | `/store/orders`, `/store/[handle]`, `/store/seller/[id]` | No order history, no product detail, no seller storefront. | P1 |
| 9 | `/wellness/instructors`, `/wellness/instructors/[id]`, `/wellness/classes/[id]`, `/wellness/my-classes`, `/wellness/meditation`, `/wellness/yoga`, `/wellness/vipassana*` | Wellness is 842 LOC of list with no detail, no enrolment, and the screen is unreachable. | P1 |
| 10 | `/yatra/[slug]/book`, `/yatra/book`, `/yatra/plan`, `/yatra/destinations`, `/yatra/companion` | Yatra is browse-only on mobile; **no booking path**. | P1 |
| 11 | `/support/ticket/new`, `/support/tickets`, `/support/tickets/view` | No in-app ticket creation or history; `support.tsx` ejects to the help centre and is orphaned. | P1 |
| 12 | `/gaushala`, `/gaushala/[id]`, `/gaushala/profile/[id]` | Devotee-facing gaushala browse/donate absent (only the provider portal exists). | P2 |
| 13 | `/admin/kyc`, `/admin/refunds`, `/admin/payouts`, `/admin/subscriptions`, `/admin/waitlist`, `/admin/leads` | Core ops surfaces missing from the mobile admin. | P2 |
| 14 | `/pujas/home-puja*` (4), `/pujas/marriage*` (2), `/antim-sanskar*` (2), `/nri-pujas` | Entire puja **product lines** absent — home puja, marriage, last rites, NRI. | P2 |
| 15 | `/temple-portal/schedule`, `/gurukul-portal/applications` | Provider daily-ops pages. | P2 |
| 16 | `/bookings/view`, `/profile/yatra-bookings`, `/darshan/[id]/replay` | Secondary views on existing flows. | P3 |
| 17 | `/credits`, `/refer`, `/sankalp`, `/matchmaking`, `/ask-pandit`, `/free-pandit-advice*` | Growth / engagement surfaces. | P3 |
| 18 | `/org*` (4), `/provider/kyc` | B2B org admin + provider KYC. | P3 |
| 19 | `/account/privacy`, `/account/digest/unsubscribe` | DPDP / GDPR self-service. | P3 |
| 20 | 120-route content tail (see 2) | Organic-search surface; low in-app priority but currently **100% absent**. | P4 |

## 7. MOBILE SCREENS WITH NO WEB EQUIVALENT

Very few — **the mobile app adds essentially nothing the web lacks.**

| Mobile screen | Status |
|---|---|
| `(devotee)/web-view.tsx` | App-shell concept, no web analog — and dead code (see 1) |
| `(devotee)/knowledge.tsx` | A hub *landing* over sanskrit/ved/sanatan; web exposes those as three separate top-level sections with no `/knowledge` hub |
| `(astrologer)/payouts.tsx`, `(gaushala)/payouts.tsx`, `(store-admin)/payouts.tsx` | Portal-scoped payouts; web routes these three roles through the shared `/payouts` |
| `(devotee)/darshan-player.tsx` | Maps to `/darshan/[id]` — not extra |
| `(onboard)/_form.tsx`, `+error.tsx`, 11 x `_layout.tsx` | Infrastructure, not screens |

## 8. PARITY SCORE

### **31 / 100**

Five of eight provider portals are at full parity and the auth/onboard skeleton exists, but the
devotee product — the reason the app is installed — is 28% present on paper and 21% reachable in
practice, cannot complete a store purchase, cannot recover a password, cannot confirm a payment,
and the entire 130-route devotional-content tail is 0% reachable because the only screens that
could serve it are behind an `EXPO_PUBLIC_KNOWLEDGE_ENABLED` flag that no EAS profile sets and a
`web-view` fallback whose native dependency was never installed.

## 9. FASTEST PATH TO A LARGE PARITY GAIN

Ordered by parity-points-per-hour, from the evidence above:

1. **Set `EXPO_PUBLIC_KNOWLEDGE_ENABLED=true` in all three `eas.json` env blocks** and add a
   `router.push('/(devotee)/knowledge')` entry point. One-line config + one nav entry unlocks
   6 content routes plus the entire learn-sanskrit / gurukuls subtree (5 more screens).
2. **Add nav entry points for the 6 orphaned screens** (astrology, temples, wellness, content,
   support, knowledge) — e.g. a "More" grid on `(devotee)/index.tsx`. Recovers 18 already-built
   routes, moving raw parity 24.1% -> 28.7% with zero new screens.
3. **`npx expo install react-native-webview`.** `WEBVIEW_AVAILABLE` flips true, `web-view.tsx`
   activates as written, and the astrology handoffs stop ejecting. This is a genuine dependency
   install, not a code change — the screen and origin whitelist are already written and tested.
4. **Fix `deep-link.ts` targets** (7 pathnames, 6 of which do not exist) so universal links land
   on real screens.
5. Then build, in order: password reset, store checkout, payment-return confirmation,
   priest booking accept.
