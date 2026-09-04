# Stale verification — lane `verify-stale-b`

Read-only pass over six findings the triage reclassified as STALE (plus SEC-01,
classified code_fixable). Instruction was to DISPROVE the stale label.
No source was edited. Nothing committed.

**Headline: one of the six is not stale. RESP-01 is live and reproducible, and I
have pixel measurements of it.** A second (I-08) is fixed as written but shipped a
new, narrower defect that its own guard test cannot see.

Method note: production is suspended (billing), so nothing here was measured
against darshya.online. Where a browser was needed I ran `next dev --turbopack`
on port 3111 against the working tree at HEAD (`68caf1d8`) and drove Chrome at a
390x844 viewport. Dev-vs-prod build differences are called out where they could
matter. The dev server was stopped afterwards.

| id | triage said | verdict | still true? |
|---|---|---|---|
| RESP-01 | stale | **triage wrong** | **YES — measured** |
| SEC-01 | code_fixable | already done at HEAD | n/a |
| DF-03 | stale | holds | no |
| I18N-04 | stale | holds | no |
| I-08 | stale | holds, but the fix has a hole | no (new defect instead) |
| RES-09 | stale | holds for the named site | no (residual elsewhere) |

---

## RESP-01 — STILL LIVE. The stale label is wrong.

The triage is right that all three pieces of the fix are present and right that
they work mechanically. It is wrong that they solve the problem. Measured in
Chrome at 390x844, first paint, consent cleared, `/auth/login`:

| measurement | value |
|---|---|
| banner height | **278px** (32.9% of viewport) — the code comment claims "~240px" |
| `--consent-h` published | `278px` ✓ |
| `body` computed `padding-bottom` | `278px` ✓ |
| banner top edge | y = 566 |
| **Sign In button** | **y 610 → 654** |
| **Sign In pixels visible** | **0** |
| `elementFromPoint(195, 632)` (button centre) | `<p>` "Essential cookies keep your account…" |

That last row is the finding's original symptom, verbatim, at HEAD. The hit test on
the Sign In button's own centre still lands on the cookie banner.

### Why the fix does not reach this page

The plumbing is fine; the geometry defeats it.

- `apps/web/app/auth/layout.tsx:38` sets `minHeight: calc(100dvh - var(--consent-h, 0px))`.
  Resolved live: **566px**. But the container's own content is **739px** (card 675px
  + `py-8` 64px). A `min-height` below the content height never binds, so the
  "centre inside the visible area" correction is **inert on this page**. It only
  helps when the card is shorter than the space left over — and the sign-in card is
  the tallest thing in the auth segment.
- The container also starts at y = 64, not y = 0: `/auth/login` is not a portal route,
  so `SiteChrome` gives it the fixed 65px header and `main` gets `padding-top: 64px`.
  Even if the min-height had bound, centring inside a 566px box that begins 64px
  down would still overhang the banner by 64px.
- Net: the card occupies y 96 → 771. The banner starts at 566. **The bottom 205px of
  the card is covered**, and the Sign In button lives entirely inside that band.

`body { padding-bottom: var(--consent-h) }` (`apps/web/app/globals.css:564`) does work
and does what it says. It is just not what was wrong here: `/auth/login` renders the
global footer beneath it, so the document was always scrollable. The padding adds
278px to a page that already had 2494px of scroll.

### Severity: lower than the original P0, but not zero

The original wording — "nobody on that device can log in" — is no longer accurate.
The page scrolls, and scrolling now rescues the button:

| scrollY | Sign In rect | hit test at its centre |
|---|---|---|
| 0 | 610 → 654 | banner paragraph |
| 100 | 510 → 554 | **BUTTON:Sign In** |
| 150 | 460 → 504 | BUTTON:Sign In |

88px of scroll fully reveals it. So the accurate statement is: **the primary CTA of
the sign-in form is 100% buried at first paint on a 390x844 phone, with no visual
affordance that scrolling is required** — the form looks complete and the button
looks absent. That is a conversion defect on the login path, not a lockout.

### Why the two regression tests are green

They cannot see this, by construction.

- `apps/web/__tests__/CookieBanner.test.tsx:140` stubs
  `Element.prototype.getBoundingClientRect` to a **hardcoded 347** because happy-dom
  reports every rect as 0x0. It then asserts `--consent-h === "347px"`. It is testing
  that the component echoes the number the test just handed it. It can never assert
  occlusion, and its constant is itself stale — the real banner is 278px.
- `apps/web/__tests__/overlay-stacking-consent-first.test.tsx` is TD-07: it checks that
  *other* overlays (chat launcher, aarti reminder) stay out of the way. It never loads
  the login form.

Both suites pass. I ran them: 14/14 and 6/6.

**No test anywhere asserts that the Sign In button is unoccluded.** That is the gap
that let this survive.

### What could not be confirmed

Measured on a `next dev` build, not the deployed one. Production is suspended
(`x-render-routing: suspend`). Fonts and CSS are identical in both, and the margin
here is not marginal — the button is 88px past the banner edge, far outside any
plausible font-metric variance — but a re-measure on a live deploy is still owed.

### The fix this needs (outside my lane)

Not owner work. `apps/web/app/auth/layout.tsx` and `apps/web/components/CookieBanner.tsx`.
The `min-height` approach cannot work for a card taller than the viewport; the auth
segment needs the banner's height as **`padding-bottom` on the scroll container** (so
the card can sit above it) or the card needs to not be vertically centred on small
viewports. And the guard test has to assert geometry — a jsdom test with a mocked
rect will never catch the regression class.

---

## SEC-01 — the code half is already done at HEAD

The triage's HEAD snapshot is superseded. It says "`next.config.ts` line 133
`async headers()` returns seven blocks, every one of them Cache-Control only."
That is no longer true.

- `apps/web/next.config.ts:164-180` — `SECURITY_HEADERS` carries all six:
  `Content-Security-Policy`, `Strict-Transport-Security`
  (`max-age=31536000; includeSubDomains; preload`), `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy`.
- Applied at `source: '/:path*'` (`next.config.ts:316-321`) — every response including
  `/_next/*`, which is why it is here and not in middleware (whose matcher excludes them).
- The CSP is built by `buildContentSecurityPolicy()` and keeps the enforcing
  `'unsafe-inline'` variant. `strict-dynamic` was **not** shipped blind. Both caveats
  the triage raised were handled.
- The `report-uri` problem is handled by omission: it survives only on the
  `Content-Security-Policy-Report-Only` line inside `apps/web/public/_headers`, which
  Render ignores. The enforcing policy references no report endpoint, so nothing points
  at the missing `/api/csp-report`.

Guard test `apps/web/__tests__/sec01-security-headers.test.ts` — **8 tests, all pass**
(verified, not assumed). It includes a parity assertion against `public/_headers` so the
two cannot drift.

Residual (hygiene, not a defect): `apps/web/public/_headers` still exists and still
reads like the source of truth to anyone who opens it. Its Report-Only policy still
names `report-uri /api/csp-report`, and `apps/web/app/api/csp-report/` does not exist.
Inert on Render, but a decoy. Deleting it belongs to whichever lane owns that file.

Not verifiable here: that the headers actually appear on the wire. That needs an
un-suspended deploy and `curl -I https://darshya.online/`.

---

## DF-03 — stale label holds, and the leftovers are done too

Line references in the triage have moved (the page was split), but every clause checks out.

- `apps/web/app/astrology/view/page.tsx` is now a server component: it `notFound()`s
  anything that is not a UUID (`isRenderableAstrologerId`, :56-59) and delegates to
  `apps/web/app/astrology/view/AstrologerProfileClient.tsx`.
- In that client: reviews render only when `astrologer.reviewCount > 0` (:470), else
  "No reviews yet. This astrologer has not completed a reviewed consultation" (:480);
  badges come from the API payload (:316); Chat/Call are `disabled` on
  `!isOnline || isBusy` (:384, :413).
- No `12,450` and no "Pt. Raghunath Sharma" survive on any astrologer surface — the
  only live matches are historical comments and test fixtures asserting their absence.
  (The surviving `12450`s are `viewerCount` on darshan/mobile pages, a different
  finding's territory.)

Both items the triage left open as "small cleanup" are **also already done**:

- `GET /specializations` (`apps/api/src/routes/astrology.ts:270-296`) derives counts from
  `loadApprovedAstrologers()` — the same reader as `/astrologers` — not the fixture.
- The `REVIEWS` generator is gone from `apps/api/src/services/astrology.service.ts`.
  Only a historical comment at :75 mentions it.

`apps/web/app/astrology/__tests__/astrology-view-404.df12.test.tsx` — 7/7 pass.

---

## I18N-04 — stale label holds

Structure is as described, and the claim underneath it is type-enforced rather than
merely asserted:

- `packages/shared/src/validators/languages.ts:43` `SUPPORTED_LANGUAGES` (10) and `:69`
  `TRANSLATED_LANGUAGES` (5: en, hi, ta, te, kn).
- `languages.test.ts` parses `schema.prisma` and pins the enum to the list — **23/23 pass**.
- `apps/api/src/lib/error-i18n.ts:34` re-exports `SUPPORTED_LANGS` from
  `TRANSLATED_LANGUAGES` instead of declaring a sixth list. The five catalogs are typed
  `Record<ErrorCode, string>` (`error-i18n.ts:68`), so TypeScript refuses an incomplete
  one — "5 languages have full catalogs" is a compiler guarantee, not a comment.
- `apps/web/components/LanguageSwitcher.tsx:26` narrows the switchable set to `'en' | 'hi'`
  and reads native names from `lib/i18n/locales.ts`.

"bn and mr are offered but silently fall back to English" is no longer true — they are
not offered. The 60-string owner decision was correctly sidestepped.

---

## I-08 — the three original clauses are fixed, but the fix has an inoperative guarantee

Verified live against the dev server (`curl`, cookie set by hand):

| request | result |
|---|---|
| `/` no cookie | 200, `content-language: en`, no `Vary: Cookie`, no `Set-Cookie` ✓ |
| `/` + `Cookie: poojly_language=hi` | **307 → `/hi`**, `vary: Cookie`, `cache-control: no-store` ✓ |
| `/` + `Accept-Language: hi-IN,hi;q=0.9`, no cookie | 200, no redirect ✓ (deliberate) |

All three clauses of the original finding are genuinely closed.

### The hole: "It does not fire on a prefetch" is not true

`apps/web/middleware.ts:115-121`:

```js
function isPrefetch(req: NextRequest): boolean {
  const h = req.headers;
  if (h.get('next-router-prefetch')) return true;   // <- unreachable
  if ((h.get('sec-purpose') ?? '').toLowerCase().includes('prefetch')) return true;
  ...
```

The first branch can never be true. Next 15.5.20's middleware adapter deletes every
FLIGHT_HEADER from the request **before middleware runs** —
`apps/web/node_modules/next/dist/server/web/adapter.js:138-146`, under its own comment
"Headers should only be stripped for middleware". `FLIGHT_HEADERS`
(`client/components/app-router-headers.js:92-98`) contains both `next-router-prefetch`
and `RSC`. The strip is gated on
`isEdgeRendering = typeof globalThis.__BUILD_MANIFEST !== 'undefined'`, which is false
for middleware in dev **and** in the Render standalone build — this is not a dev artifact.

Measured, cookie `poojly_language=hi`, request to `/`:

| header sent | result |
|---|---|
| `Sec-Purpose: prefetch` | 200 ✓ |
| `Purpose: prefetch` | 200 ✓ |
| `X-Moz: prefetch` | 200 ✓ |
| `Next-Router-Prefetch: 1` | **307 → /hi** ✗ |
| `RSC: 1` + `Next-Router-Prefetch: 1` (real next/link shape) | **307 → /hi** ✗ |

And from the browser, the exact call next/link makes —
`fetch('/?_rsc=abcde', {headers: {RSC:'1','Next-Router-Prefetch':'1'}})` — returned
`redirected: true`, `finalUrl: http://localhost:3111/hi`, body = /hi's flight payload.

The three working branches never fire for this case: browsers add `Sec-Purpose` for
`<link rel=prefetch>` and speculation rules, not for a `fetch()`. So the one prefetch
path the comment actually names — "next/link prefetches the header logo on every page"
— is precisely the path that is not protected, and /hi's payload does land in the
Router Cache under href `/`.

### Its guard test cannot see this either

`apps/web/__tests__/i18n-root-redirect.test.ts:58-64` builds a `NextRequest` in-process,
sets `Next-Router-Prefetch: 1` on it, and calls `middleware()` as a plain function. That
bypasses the adapter that does the stripping, so the header is still there when the code
reads it. The test asserts a guarantee the runtime cannot deliver. **16/16 green.**

Same shape as the source-scanning guard bugs this audit has hit repeatedly: the test
exercises the code, not the environment the code runs in.

Fix (outside my lane, `apps/web/middleware.ts`): drop the dead branch and detect the
prefetch by what actually survives — the `_rsc` union query on `req.nextUrl.searchParams`
— or accept the redirect and make it safe. The test needs to stop hand-feeding a header
the platform removes.

---

## RES-09 — stale label holds for the named call site; the pattern persists elsewhere

Closed as scoped:

- `apps/web/app/bookings/page.tsx:301-306` — `const loadError = error ? friendlyApiError(error) : null`,
  with the RES-09 comment naming the old `API 500: {"error":"Internal Server Error"}` leak.
- Empty state gated so it cannot render under an error (:411).
- `apps/web/__tests__/error-honesty-res07-res09.test.tsx` — **8/8 pass**.

One correction to the triage's evidence: `friendlyApiError` is imported by seven source
files, but not the seven listed. Actual: `app/admin/leads`, `app/admin/ratings`,
`app/bookings/page`, `app/bookings/view/page`, `app/store/checkout`, `app/store/orders`,
`components/ReauthPrompt`. **`apps/web/app/pujas/book/page.tsx` does not import it**,
contrary to the triage note.

Residual (real, devotee-facing): roughly 25 call sites still do
`setError(err instanceof Error ? err.message : '…')`. Most are `/admin` (staff-facing).
At least one is not:

- `apps/web/app/account/subscriptions/page.tsx:58` and `:84` set raw `err.message` and
  render it at `:102`. Its own throws leak a status code
  (`Failed to load subscription (500)`), `data.error` can be the server's
  `Internal Server Error`, and on a network failure `err.message` is the browser's raw
  `Failed to fetch`.
- `apps/web/lib/api.ts:51` still throws ``API error: ${res.status} ${res.statusText}`` —
  developer text by construction, one render away from a user.

The triage's own suggestion (a lint rule banning raw `error.message` in JSX) is the right
permanent shape; a snapshot sweep will rot again.

---

## Tests run

No source was edited, so the full suites were not re-run. Everything cited above was
executed:

| suite | result |
|---|---|
| `apps/web` — CookieBanner, overlay-stacking, error-honesty, sec01-security-headers, astrology-view-404 | **43/43 pass** |
| `apps/web` — i18n-root-redirect | **16/16 pass** |
| `packages/shared` — validators/languages | **23/23 pass** |

Every one of these is green. Two of them are green **while the defect they nominally
guard is live** (RESP-01, I-08 prefetch). That is the most transferable result in this
pass: on both, the assertion was written against a mock that stands in for the exact
layer where the failure happens — a stubbed `getBoundingClientRect` for a layout bug, a
hand-built `NextRequest` for a header-stripping bug.
