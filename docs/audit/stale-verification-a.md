# Stale-verification lane A — six findings re-checked at HEAD

**Verifier lane:** `verify-stale-a` (read-only — no source edited)
**HEAD when checked:** `68caf1d8` on `feat/recurring-razorpay-planid`
**Deployed commit compared against:** `ca044898` ("fix: close 307 of 388 sweep findings (#247)")
**Date:** 2026-08-24
**Production:** suspended (Render billing, since 2026-08-17). Nothing below was probed against
production. Every claim is either a code measurement at a named commit or a network measurement
against a third-party host, and each is labelled as such.

All six were classified STALE by the 2026-08-15 triage. The brief for this lane was to try to
disprove that. **Four hold. Two do not.**

| id | key | triage said | verdict | what changed |
|---|---|---|---|---|
| PM-03 | F044 | stale | **still true** | schema half fixed; two live 70%/30% artifacts remain |
| PM-10 | F051 | stale | stale | confirmed, and confirmed at the deployed commit |
| PF-04 | F099 | stale | stale | confirmed; triage's "not on prod" caveat is itself wrong |
| COM-11 | F033 | stale | stale | confirmed; triage named the wrong PDP route |
| COM-18 | F040 | stale | stale | confirmed by byte measurement; attribution already done too |
| PERF-03 | F376 | stale | **still true** | brand faces still render nowhere; prescribed fix is broken |

---

## PM-03 (F044) — "The live default platform take is 30%, not the 20% the whole business is built on"

### Verdict: STILL TRUE. The triage classification does not hold.

**What the triage got right, reproduced:**

- `apps/api/prisma/schema.prisma:338` — `commissionRate Float @default(0.80) @map("commission_rate")`.
  Byte-identical at HEAD and at `ca044898`. The `@default(0.70)` text the finding quoted exists
  nowhere in the tree.
- `apps/api/prisma/migrations/20260812000000_priest_commission_rate_80/migration.sql` is committed
  (`1645e4da`) and present at `ca044898`. It does the `ALTER … SET DEFAULT 0.80` plus
  `UPDATE "priests" SET "commission_rate" = 0.80 WHERE "commission_rate" = 0.70`.
- `prisma migrate deploy` really does run at every API boot, by both paths —
  `render.yaml:21` `startCommand: pnpm --filter @poojly/api start` → `apps/api/package.json:9`
  `"start": "prisma migrate deploy && node dist/server.js"`, and `apps/api/Dockerfile:66`
  `CMD ["sh","-c","npx prisma migrate deploy && node dist/server.js"]`.
- `apps/api/src/services/booking.service.commission-doctrine.pj03.test.ts` — **5 passed**.

**Two corrections to the triage's own evidence:**

1. The triage says `docs/audit/DEPLOY-PLAN.md:86` still asserts that migrations do not auto-apply.
   It does not. Step 5 of the deploy table already reads
   *"~~Apply the migration by hand~~ **NOT NEEDED — corrected 2026-08-19.**"* and then cites the
   same two paths. That correction landed before this triage was written.
2. The triage recommends *"refresh the now-stale explanatory comment block at
   `apps/api/src/services/booking.service.ts:89-107`"*. **Do not.** That block is current: it
   records PJ-03 as *"opened 2026-08-11, CLOSED 2026-08-13"* and enumerates the three shipped
   halves. It is also pinned — `booking.service.commission-doctrine.pj03.test.ts` asserts the file
   does **not** contain `OPEN SCHEMA MISMATCH` or `still carries \`@default(0.70)\``, and **does**
   still contain `20%` and `Priest.commissionRate`. Rewriting it risks turning that guard red for
   no gain.

**What is still live — the reason this is not stale.** Both artifacts are present at HEAD *and* at
`ca044898`, so both are on the deployed commit:

**(a) `apps/api/prisma/seed.ts:934`** — the `create:` branch of the priest upsert still writes
`commissionRate: 0.70`. It is the only place in `apps/api/src` or `apps/api/prisma` that writes an
explicit `commissionRate` at creation time; everything else reads it or is the admin PATCH path
(`routes/admin.ts:544`). Sequence on a fresh database: `migrate deploy` runs first against an empty
`priests` table, so the backfill `UPDATE` matches zero rows; the seed then inserts three pandits at
`0.70`; the migration is now recorded applied and never runs again. Those three pandits are paid
70% permanently. `resolvePriestShare` (`routes/bookings.ts:605-608`) trusts any stored value in
`(0,1]`, and `0.70` is inside that band, so `DEFAULT_PRIEST_SHARE = 0.8` never fires for them —
exactly the trap the migration's own header describes. Re-seeding an *existing* database is safe:
the `update:` branch does not touch `commissionRate`. Not covered by the pj03 guard, which only
reads `booking.service.ts` and `schema.prisma`.

**(b) `apps/web/app/admin/settings/page.tsx:285-291`** — rendered admin copy, inside
`{activeTab === 'commissions' && ( … )}`, in the "Where the rate is set" card:

> Intended take: 20% platform / 80% provider. Rows above that differ are not a display fault — a
> pandit's stored share is the source of truth, and **its schema default is still the pre-revamp
> 70% (a 30% platform take)**. Reconciling the two is an open owner decision recorded in the
> booking service.

False at HEAD. The schema default is `0.80` and the reconciliation is not open. This is the
finding's own headline claim — 30% vs 20% — still being told to an operator, on the one screen
built to be the honest answer about take rates. The same false statement is repeated in the
docblock above `INTENDED_TAKE_RATE_PCT` (line 45): *"prisma still declares
`Priest.commissionRate @default(0.70)`, so a pandit onboarded through the normal flow is billed at
a 30% platform take"*.

**Residual I could not close (needs a live database):**

- The actual `priests.commission_rate` values in the production database.
- Whether `20260503_perf_indexes` is recorded applied in production `_prisma_migrations`. With SQL
  comments stripped it still carries **10 live `CREATE INDEX CONCURRENTLY` statements** — the only
  migration in the tree that does (the other four files matching `CONCURRENTLY` mention it only in
  comments). Its own header claims *"prisma migrate deploy executes each statement separately,
  which is fine"*, which contradicts the documented 25001 trap. It sorts before
  `20260812000000`, so if it is not recorded applied, the commission migration has never run in
  production and PM-03 is live there in the original form as well. Pre-existing at both commits,
  not a regression.

---

## PM-10 (F051) — "Astrologer per-minute rates render with no currency symbol at all"

### Verdict: STALE. Confirmed, and confirmed at the deployed commit.

Note the ledger holds two PM-10 rows: F051 (this one, ux) and F062 (senior astrologers priced
below the market ceiling). Only F051 is in scope here.

The finding's surface is the *"Verified astrologers on Darshya"* strip on `/astrology`. That is
`apps/web/app/astrology/page.tsx:239-241` → `components/ApprovedProvidersStrip.tsx`. The quoted
string `25 / min` — with spaces around the slash — matches `getPriceLabel`'s
`case 'astrologer': return fmt(p.pricePerMinute, ' / min')` at line 55 and no other surface in the
app, so this is the right component rather than the astrology cards.

`ApprovedProvidersStrip.tsx:49-52`:

```ts
const fmt = (v: number | string | undefined, suffix: string) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? `₹${n.toLocaleString('en-IN')}${suffix}` : null;
};
```

`git show ca044898:apps/web/components/ApprovedProvidersStrip.tsx` is identical, so the ₹ is on
the deployed commit. It landed in `97fbd58c` ("close 184 of 388 sweep findings"), a remediation
commit after the 2026-08-12 sweep that recorded the defect — the history is consistent.

Every other per-minute surface also carries the glyph:
`AstrologyClient.tsx:550`, `astrologers/live/LiveAstrologersClient.tsx:178`,
`astrology/view/AstrologerProfileClient.tsx:351` (as `₹`),
`astrology/[id]/book/page.tsx:284` and `:331`.

Two surfaces state the currency without the glyph, neither being the reported bare-number defect:
`onboarding/view/page.tsx:894` renders `INR 15/min`, and `AstrologyClient.tsx:365` renders
`From Rs. 15/min`.

Contract check so the label cannot silently become null: `apps/api/src/routes/providers.ts:105`
includes `pricePerMinute` in the astrologer projection, matching
`ApprovedProvider.pricePerMinute` in `apps/web/lib/api.ts:435`.

Code-only. A visual re-check on the live page is still worth doing once production is restored.

---

## PF-04 (F099) — "No UI anywhere can mark a booking delivered"

### Verdict: STALE. Confirmed — and the triage's one caveat is itself wrong.

- `apps/web/app/priest/bookings/view/page.tsx:219-242` — `markDelivered()` PATCHes
  `${API_BASE_URL}/bookings/${booking.id}` with `{status:'delivered'}` and a Bearer token.
- Rendered as a real control at lines 476-484 (`onClick={markDelivered}` at 478, label "Mark
  delivered" at 483), inside `{booking.status === 'video_uploaded' && ( … )}` at line 450.
- **The API accepts it**, which the triage did not check: `apps/api/src/routes/bookings.ts:161`
  carries the `z.literal('delivered')` body variant, and
  `ASSIGNED_PRIEST_ALLOWED_TRANSITIONS` (lines 355-361) includes `'delivered'`, so
  `checkTransitionRole` returns `{ ok: true }` for the assigned pandit. The button is wired to a
  route that will honour it.
- Guard test `apps/web/__tests__/priest-fulfilment-p1.test.tsx` — **18 passed**, six of them under
  `PF-04 — the pandit can close the job from the portal`, covering the detail page, the bookings
  *list*, re-reading after delivering, a rejected delivery surfacing an error, and never offering
  the control on an already-delivered row.

**Correction.** The triage's caveat reads *"prod is pinned at ca044898 while this fix is in local
HEAD e1e16159, so it is fixed in code and not yet proven in production."* The first half is false:
`git show ca044898:apps/web/app/priest/bookings/view/page.tsx` contains `markDelivered` (2
occurrences) and `git show ca044898:apps/web/__tests__/priest-fulfilment-p1.test.tsx` contains the
PF-04 block. The fix is on the deployed commit.

Still worth doing once production is back, for the money path rather than the UI: walk one booking
`video_uploaded → delivered` and confirm the Commission/payout row is minted, since delivery is the
transition that recognises revenue.

---

## COM-11 (F033) — "Store-owner products are invisible on the storefront"

### Verdict: STALE. Confirmed — with one correction to the route the triage named.

The finding's core claim was that a repo-wide grep for `products/live` across `apps/web` returns
zero results. It no longer does:

- `apps/web/lib/store-live.ts` — `getLiveProducts()` fetches
  `${API_BASE_URL}/store/products/live?limit=` with `next:{revalidate:120}`, normalises rows, and
  returns `[]` on any non-OK or throw with no fixture fallback.
- `apps/web/app/store/page.tsx:86` fetches it inside the `Promise.all`; line 303 renders
  `<SellerShelf products={sellerProducts} />`.
- `apps/web/components/store/SellerShelf.tsx` returns `null` on an empty list and otherwise renders
  each card with `AddToCartButton` and a link to the seller PDP.
- Directory route `apps/web/app/store/products/live/page.tsx`.
- Backing endpoint confirmed: `apps/api/src/routes/store.ts:12` `server.get('/products/live', …)`.

All four files are present at `ca044898` as well.

**Correction.** The triage names *"a seller PDP route `apps/web/app/store/[handle]/`"*. That is the
wrong route. `apps/web/app/store/[handle]/page.tsx` is the COM-10 fixture PDP — it resolves via
`getProductByHandle` from `lib/medusa` and prerenders the 24 seed handles. The seller PDP is
**`apps/web/app/store/seller/[id]/page.tsx`**, which calls `getLiveProduct(id)`; `SellerShelf`
links to `/store/seller/${p.id}`, so the wiring is self-consistent. Only the triage's path was
wrong.

The triage's other caveat — that `getLiveProduct()` filters the active list rather than fetching by
id — is real but is a documented design choice, not a latent id/handle mismatch: `StoreProduct` has
no `handle` column in `schema.prisma`, and the API sets `handle: p.id` explicitly
(`store.ts:31`, commented *"PDP by id until a slug/handle column is added"*), so the two keys are
the same string. An out-of-stock or deactivated product resolving to `null` is the intended answer.

Tests: `store-seller-shelf.test.tsx` **9 passed**, `store-live-directory-route.test.tsx`
**5 passed**.

What remains is not the reported defect: there are apparently zero `StoreProduct` rows to display,
which is a supply problem, not a code one.

---

## COM-18 (F040) — "Store product images are full-resolution Wikimedia hotlinks"

### Verdict: STALE. Confirmed by direct byte measurement.

**API side.** `apps/api/src/services/store.service.ts:77-86` — `PRODUCT_IMAGE_WIDTH = 600`, and
`img()` routes every absolute URL through `commonsThumb(photoIdOrUrl, PRODUCT_IMAGE_WIDTH)` from
`apps/api/src/lib/commons-thumb.ts`, which snaps to the Commons ladder.

**Web side.** `grep -c 'upload.wikimedia.org' apps/web/lib/products.ts` → **0**. Products now carry
an `imageKey` (25 entries) resolved by `getProductImage()` at `apps/web/lib/images.ts:830`, which
calls `remoteImage()` (line 282) → `wikiThumb()` for Commons, param-rewrite for Unsplash.
`apps/web/app/store/page.tsx:183-187` additionally emits
`srcSet={remoteSrcSet(…, [IMG_W.THUMB, IMG_W.CARD])}` with
`sizes="(max-width: 768px) 50vw, 280px"`.

**My measurement.** I imported `apps/web/lib/images.ts` with `tsx` and resolved all 25 store keys
through the real `getProductImage`, then `curl -I`'d every resulting URL:

| candidate | files | total |
|---|---|---|
| 250w (`IMG_W.THUMB`, the DPR-1 pick at a 375px viewport) | 24 measured | **283 KB** |
| 500w (`IMG_W.CARD`, the DPR-2 pick — the realistic phone case) | 24 measured | **1,381 KB** |

All 25 return HTTP 200 on retry; the one miss in the bulk pass was transient rate limiting.

Spot-check on the finding's own worst offender —
`Rudraksha_mala.jpg`: **250px = 20 KB**, **500px = 76 KB**, against the finding's 5,594 KB original
in a 170px slot. Against the finding's measured 29,056 KB for the page, the worst realistic case is
now ~1.4 MB — roughly a 95% reduction. (I could not re-measure the originals: bare
`upload.wikimedia.org/wikipedia/commons/…` requests answered 429 after the bulk sweep.)

**The triage's remaining item is also already done.** It asks for *"the attribution surface … a
credits list rendered on /store or a per-image caption."* `apps/web/app/credits/page.tsx` renders
`COMMONS_CREDITS` from `apps/web/lib/image-credits.ts`, which carries the store files with license
and author — including `Rudraksha_mala.jpg` (Janak Bhatta, CC BY-SA 4.0, `attributionRequired:
true`), `Hindu_pooja_thali.jpg` (CC0) and `Pure_Ghee-Homemade-Maharashtra.jpg` (CC BY-SA 4.0) —
and the page names store product photography explicitly at lines 157-158.

Self-hosting the 24 thumbnails is a hardening preference, not the reported defect.

---

## PERF-03 (F376) — "Brand webfonts have been dead for some time"

### Verdict: STILL TRUE. The classification does not hold, and the prescribed fix is broken.

The triage says *"BOTH halves of the premise are now false"* and then, three sentences later,
*"WHAT IS STILL TRUE: `apps/web/public/fonts` does not exist … the brand faces still do not
render."* Those cannot both be the basis for a stale label. I measured all of it.

**Half 1 — the Fontshare API. Partly false, and not in the way the triage reported.**

The endpoint is up, but the exact combined URL the triage prescribes silently drops Satoshi:

```
GET api.fontshare.com/v2/css?f[]=cabinet-grotesk@500,700&f[]=satoshi@400,500,700&display=swap
  → HTTP 200, 1,202 bytes, 2 @font-face rules
  → font-family: 'Cabinet Grotesk' (500, 700) only.  Zero Satoshi rules.

GET api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap
  → HTTP 200, 1,759 bytes, 3 @font-face rules (400, 500, 700).
```

Reproduced twice. The triage reported *"a 3,541-byte body containing real @font-face rules"* for
the combined URL; the real body is 1,202 bytes and covers one of the two families. An agent
following the prescription verbatim — *"the direct cdn.fontshare.com/wf/…woff2 URLs are in the
stylesheet response that endpoint is serving again today"* — would self-host Cabinet Grotesk,
silently miss Satoshi, and ship a `--font-body` that still resolves to nothing. **Request the two
families separately.**

**Half 2 — the code was remediated, and is on production. True.**

`git show ca044898:apps/web/app/layout.tsx` has no Fontshare `<link>` and no api/cdn.fontshare.com
preconnect, only the comment at lines 389-400 (PERF-03 block opens at line 390) explaining why it must not
come back.
`__tests__/seo/head-resource-budget.test.ts` **9 passed** and `__tests__/seo/indic-webfonts.test.ts`
**24 passed**.

**What is still live — the defect the finding's title actually names.**

- `apps/web/public/fonts` does not exist.
- `grep -rn "@font-face" apps/web/app apps/web/components apps/web/public` returns **4 hits, all
  inside comments**. There is not one real `@font-face` declaration in the web app.
- Therefore `--font-display: 'Cabinet Grotesk', var(--font-noto-sans), system-ui, sans-serif`
  (`globals.css:146`) and `--font-body: 'Satoshi', var(--font-noto-sans), …` (`globals.css:499`)
  both fall through to Noto Sans on every render.
- `var(--font-display)` has **105 usages** across `apps/web/app` and `apps/web/components`.
  Zero brand-face glyphs paint anywhere in the product.

The improvement is real and worth recording: the fallback is now Noto Sans, which
`next/font/google` genuinely loads (`layout.tsx:130-141`, variable applied to `<html>` at line
377), so *"5,545 of 5,604 glyphs paint in Arial"* is no longer reproducible. The severity dropped.
The finding did not become untrue.

**A smaller version of the "unused woff2" half also survives.** Crimson Pro
(`--font-reader-serif`, `layout.tsx:172-183`) is declared at four weights with **no
`preload: false`**, unlike all four Indic faces. Its only live consumer is
`[data-reader-theme]` at `globals.css:1252`, set by `components/books/ReaderClient.tsx:77` — so it
is preload-hinted site-wide and painted only in the book reader. `--font-serif`
(`globals.css:147`) has zero `var()` consumers anywhere. I did not byte-measure this; it needs a
build.

**The assertion the finding asked for still does not exist.** Both guard tests are source-text
greps over `layout.tsx`. They prove the Fontshare link is gone; neither can detect a webfont that
is declared but never paints. The requested Playwright check — CDP
`CSS.getPlatformFontsForNode` on `body` reporting `isCustomFont: true` — has no equivalent in the
tree, so the exact failure mode this finding is about can still recur silently.

---

## Test runs (all read-only; no source edited, nothing committed)

| suite / file | result |
|---|---|
| `apps/api` `booking.service.commission-doctrine.pj03.test.ts` | 5 passed |
| `apps/web` `__tests__/priest-fulfilment-p1.test.tsx` | 18 passed |
| `apps/web` `__tests__/seo/head-resource-budget.test.ts` | 9 passed |
| `apps/web` `__tests__/seo/indic-webfonts.test.ts` | 24 passed |
| `apps/web` `__tests__/store-seller-shelf.test.tsx` | 9 passed |
| `apps/web` `__tests__/store-live-directory-route.test.tsx` | 5 passed |
| `apps/web` `__tests__/pricing-commission-truth.test.tsx` | 14 passed |
| `apps/web` `__tests__/take-rate-reconciliation.test.ts` | 9 passed |

Full suites were not re-run: this lane edited no source, so the 2363/2364 API and 3230/3230 web
baselines are untouched.

## Handoff — work identified, outside this lane

1. `apps/api/prisma/seed.ts:934` — change `commissionRate: 0.70` to `0.80` in the `create:` branch.
   API lane. Ship it with a test that asserts no seeded priest is created below
   `DEFAULT_PRIEST_SHARE`, and extend the pj03 guard to cover `seed.ts` — it currently reads only
   `booking.service.ts` and `schema.prisma`.
2. `apps/web/app/admin/settings/page.tsx:285-291` and the docblock at line 45 — remove the "schema
   default is still the pre-revamp 70% (a 30% platform take) … open owner decision" claim. Web
   admin lane. `apps/web/__tests__/admin-settings-readonly.test.tsx` already renders this screen,
   so the assertion has a home.
3. Do **not** touch `apps/api/src/services/booking.service.ts:89-107`, despite the triage note. It
   is accurate and pinned by a guard test.
4. PERF-03 font work, if taken: fetch `cabinet-grotesk` and `satoshi` in **separate** requests —
   the combined URL returns Cabinet Grotesk only. Consider `preload: false` on Crimson Pro.
5. Once production is restored: read `priests.commission_rate`; confirm
   `20260503_perf_indexes` is recorded applied in `_prisma_migrations` (10 live `CREATE INDEX
   CONCURRENTLY` statements, sorts before the commission migration); re-measure `/store` weight at
   375px; walk one booking `video_uploaded → delivered` and confirm the payout row mints.
