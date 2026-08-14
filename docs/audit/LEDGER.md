# Sweep remediation ledger

Source: `prod-sweep-raw-2026-08-12.md` — 388 findings, 32 agents, 4 workflows.
Update with `node docs/audit/ledger.mjs set <key> <state> <commit> <note>`.

## Closed: 184 of 388 (47.4%)

| Severity | Total | Fixed | Partial | Owner | Open |
|---|---:|---:|---:|---:|---:|
| P0 | 65 | 50 | 9 | 1 | 5 |
| P1 | 155 | 99 | 52 | 4 | 0 |
| P2 | 120 | 35 | 41 | 8 | 36 |
| P3 | 48 | 0 | 0 | 0 | 48 |
| **All** | **388** | **184** | **102** | **13** | **89** |

## Closed and partial

| Key | Sev | ID | Area | State | Commit | Note |
|---|---|---|---|---|---|---|
| F001 | P0 | PJ-01 | provider-journeys | fixed | 1645e4da |  |
| F002 | P0 | PJ-02 | provider-journeys | fixed | — | 3 false claims corrected (Monday rail, 60-80%, 200+ pandits vs 3 in DB); 6 tests red first |
| F003 | P1 | PJ-03 | provider-journeys | partial | — | DISPUTED by verify: The web half is genuinely delivered and non-vacuous: the 0.70 client default is gone, priest/profile/page.tsx:264-265 derives `priestSharePct = Math.r |
| F004 | P1 | PJ-04 | provider-journeys | partial | — | New /priest/offers screen backed by GET /priest/offers with Accept/Decline posting to the existing endpoints; new app/priest/bookings/[id]/page.tsx th |
| F005 | P1 | PJ-05 | provider-journeys | fixed | — | already_fixed · NOT REPRODUCIBLE in source — the repair the sweep described as 'in the working tree but not in  |
| F006 | P1 | PJ-06 | provider-journeys | fixed | — | verified: Fully verified. `fallbackProfile` and every persona literal are gone from apps/web/app/priest/profile/page.tsx |
| F007 | P2 | PJ-07 | provider-journeys | fixed | — | w3: apps/api/src/routes/priests-public-id.test.ts — 7 tests. Three assert 'me', an arbitrary slug a |
| F008 | P2 | PJ-08 | provider-journeys | partial | — | One concrete thing still broken, in a file outside this lane: the approval email at apps/api/src/routes/admin-leads.ts:489 sends the freshly-provision |
| F009 | P2 | PJ-09 | provider-journeys | fixed | — | w3: apps/web/__tests__/priest-portal-p2.test.tsx, 2 tests. Pre-existing: the page source contains n |
| F010 | P0 | DF-01 | devotee-funnel | fixed | — | draft in sessionStorage + full redirect preserved; live-verified restore to step 4 |
| F011 | P1 | DF-02 | devotee-funnel | fixed | — | verified: Thorough and honest. lib/puja-catalogue.ts fetches GET /pujas/types?limit=100 and parses `payload.pujaTypes` — |
| F012 | P1 | DF-03 | devotee-funnel | owner | — | LANE GATE, not a business gate: app/astrology/** is on my explicit do-not-touch list this wave. Whoever owns it needs to (a) delete the hardcoded revi |
| F013 | P1 | DF-04 | devotee-funnel | fixed | — | verified: lib/temple-booking.ts is genuinely strict: matchTempleOffering normalises then requires an exact match or a cu |
| F014 | P2 | DF-05 | devotee-funnel | partial | — | DISPUTED by verify: SCOPE OVER-CLAIM plus an inherited dead mechanism. What is real: '1,500+ weddings' is gone from both app/pujas/page.tsx (-> 'Full samagri included') a |
| F015 | P2 | DF-06 | devotee-funnel | fixed | — | verified: lib/gaushala-plans.ts holds the four-tier ladder verbatim (plan_daily ₹51/day, plan_monthly ₹3,000/month, plan |
| F016 | P2 | DF-07 | devotee-funnel | fixed | — | already_fixed · Does not reproduce. components/home/NriLaneAbTest.tsx:62-69 now reads 'Gift a puja from abroad  |
| F017 | P2 | DF-08 | devotee-funnel | partial | — | Cannot be fixed in code as stated. 'Remove the cow_00X mock entries so only real adoptable cows are shown' would leave the gau-seva page with zero inv |
| F018 | P2 | DF-09 | devotee-funnel | fixed | — | verified: All three defects addressed, and the hardest one honestly. The 32-entry hardcoded April grid is DELETED and re |
| F019 | P2 | DF-10 | devotee-funnel | fixed | — | verified: All three renders are genuinely gone from app/darshan/[id]/page.tsx: the `{stream.viewerCount.toLocaleString(' |
| F023 | P0 | COM-01 | commerce-temple-gaushala | partial | 1645e4da | fails honestly now; catalogue split owner-gated |
| F024 | P0 | COM-02 | commerce-temple-gaushala | partial | 1645e4da | donor PAN sent; donee 80G regn missing |
| F025 | P0 | COM-03 | commerce-temple-gaushala | fixed | 1645e4da |  |
| F026 | P1 | COM-04 | commerce-temple-gaushala | fixed | — | already_fixed · Donor PAN and dedication now reach the API. apps/web/components/DonationForm.tsx:251-252 spread |
| F027 | P1 | COM-05 | commerce-temple-gaushala | fixed | — | already_fixed · Yatra checkout no longer takes the price from the client. apps/api/src/routes/yatra-inquiry.ts: |
| F028 | P1 | COM-06 | commerce-temple-gaushala | fixed | — | already_fixed · One source of truth for the total, on both sides. apps/api/src/routes/store-orders.ts:10 import |
| F029 | P1 | COM-07 | commerce-temple-gaushala | fixed | — | already_fixed · Both halves shipped. API: apps/api/src/routes/gaushala.ts:30-55 falls through from the gs_00x f |
| F030 | P1 | COM-08 | commerce-temple-gaushala | fixed | — | verified: Fix is real, served, and the test is provably non-vacuous.

PREMISE RE-VERIFIED AGAINST LIVE PROD (I tried to  |
| F031 | P1 | COM-09 | commerce-temple-gaushala | fixed | — | already_fixed · The buyer-facing order history exists. apps/web/app/store/orders/page.tsx is a real 272-line pa |
| F032 | P1 | COM-10 | commerce-temple-gaushala | fixed | — | verified: Strongest of the three - verified at build-output level, not just at test level.

DELIVERED-MARKUP PROOF: ran  |
| F033 | P1 | COM-11 | commerce-temple-gaushala | partial | — | The single unified catalogue and keyspace is COM-01, which is owner-gated — I was instructed not to unify. Two pieces stay open until that decision: ( |
| F034 | P2 | COM-12 | commerce-temple-gaushala | partial | — | Seeding temple_puja_offerings for the 15 empty temples (akshardham-delhi, badrinath-uttarakhand, vaishno-devi-katra, shirdi-sai-baba, meenakshi-madura |
| F035 | P2 | COM-13 | commerce-temple-gaushala | fixed | — | already_fixed · Closed by an earlier wave; no change made. git show HEAD:apps/web/app/store/page.tsx:221-225 st |
| F036 | P2 | COM-14 | commerce-temple-gaushala | fixed | — | verified: Change is real. apps/web/app/wellness/page.tsx no longer contains the featuredInstructors literal array (verif |
| F037 | P2 | COM-15 | commerce-temple-gaushala | fixed | — | verified: Fully verified. The diff deletes the POST /book handler, the 14-row `sessions` fixture array and the in-memory |
| F038 | P2 | COM-16 | commerce-temple-gaushala | partial | — | Building donation settlement (a payout record per donation keyed on the real donee's User id, surfaced in the temple/gaushala portal, disbursed throug |
| F039 | P2 | COM-17 | commerce-temple-gaushala | fixed | — | already_fixed · Closed by an earlier wave; no change made. apps/web/app/yatra/[slug]/book/page.tsx now reads ti |
| F040 | P2 | COM-18 | commerce-temple-gaushala | partial | — | Self-hosting the 24 product images under /public and serving them through next/image — the finding's follow-on step — is not done, so the catalogue is |
| F042 | P0 | PM-01 | pricing-market | fixed | 1645e4da | already_fixed · Same defect as PM-04b, filed as P0 under the first heading: the `$` prefix on puja.nriPrice at  |
| F043 | P0 | PM-02 | pricing-market | fixed | — | already_fixed · Closed by the earlier pass, verified not re-broken. apps/web/lib/pricing.ts:50-58: the `Plan` i |
| F044 | P0 | PM-03 | pricing-market | partial | 1645e4da | schema default 0.80 + migration landed; admin override + test remain |
| F045 | P1 | PM-04 | pricing-market | partial | — | The server hole itself is apps/api/src/routes/subscriptions.ts + subscription.service.ts, explicitly DO-NOT-TOUCH for this cluster. POST /subscribe mu |
| F046 | P1 | PM-05 | pricing-market | fixed | — | verified: Substance independently verified against the live API and the real build output; two evidence inaccuracies not |
| F047 | P1 | PM-06 | pricing-market | fixed | — | already_fixed · Does not reproduce. The dated bank SLA ('processed every Monday … within 2-3 business days') is |
| F048 | P1 | PM-07 | pricing-market | fixed | — | already_fixed · VERIFIED IN TREE: apps/api/prisma/schema.prisma:338 now reads `commissionRate Float @default(0. |
| F049 | P1 | PM-08 | pricing-market | partial | — | The reconciliation itself is the owner's single decision (the sweep recommends 20% uniform, published, permanent). Encoding it then touches apps/api/p |
| F050 | P2 | PM-09 | pricing-market | owner | — | Owner decision plus two out-of-lane changes. (1) BUSINESS: the sign-off line at the bottom of E:\NewClaude\deliverables\launch-catalog-2sku-pricing.md |
| F052 | P2 | PM-11 | pricing-market | partial | — | The literal /store/products/live route is unfixable in this lane: creating it means adding apps/web/app/store/products/live/page.tsx, and app/store/** |
| F053 | P0 | PM-01 | pricing-market | owner | — | Owner decides: implement the tier→commission override in apps/api/src/lib/commission-math.ts and have all five Commission writers resolve through it ( |
| F054 | P0 | PM-02 | pricing-market | fixed | — | already_fixed · Same defect as PM-02a from the second heading. Additionally verified the two downstream halves  |
| F055 | P1 | PM-03 | pricing-market | fixed | — | already_fixed · Does not reproduce as published. The four-column tier ladder is gone from the rendered table; l |
| F056 | P1 | PM-04 | pricing-market | fixed | — | already_fixed · Does not reproduce. Both NRI price renders are deleted from apps/web/app/pujas/[slug]/page.tsx; |
| F057 | P1 | PM-05 | pricing-market | owner | — | Two reasons. (1) Lane: the feature list is server data in apps/api, explicitly DO-NOT-TOUCH for this cluster, and it is what /pricing renders verbatim |
| F058 | P1 | PM-06 | pricing-market | fixed | — | already_fixed · Same defect as A1-PM-06, reported twice across the two pricing-market sections; same single fix |
| F060 | P2 | PM-08 | pricing-market | fixed | — | wave2: apps/web/__tests__/pricing-commission-truth.test.tsx — "no COMMISSION_RATES row carries ba |
| F063 | P0 | PF-01 | puja-funnel | fixed | 1645e4da | tier now seeded from query param; shim+wizard contract closed |
| F064 | P1 | PF-02 | puja-funnel | fixed | — | verified: Correctly identified as the same defect as DB-04: the sweep's PF-02 at prod-sweep-raw-2026-08-12.md:402 cites  |
| F065 | P1 | PF-03 | puja-funnel | fixed | — | verified: Both sites really changed: apps/web/app/checkout/offering/page.tsx:102-104 and :207-209 now call buildLoginRed |
| F074 | P0 | HN-01 | home-nav | fixed | — | homepage 14,815->945 KB; 4 leak paths bypassing wikiThumb closed |
| F075 | P1 | HN-02 | home-nav | fixed | — | already_fixed · NOT REPRODUCIBLE — closed under the RESP-01 remediation before I started, and the file document |
| F076 | P1 | HN-03 | home-nav | partial | — | File-lane assignment, not an owner decision. My lane is app/become-*/**, app/list-temple/**, app/list-gaushala/**, app/priest/** and the homepage + co |
| F077 | P1 | HN-04 | home-nav | partial | — | Two separate gates. (a) The header/nav translation lives in lib/i18n/** and lib/t.ts plus the global header component — lib/i18n/** and lib/t.ts are o |
| F078 | P1 | HN-05 | home-nav | partial | — | Both remaining files are out of this lane — lib/images.ts is on the explicit do-not-touch list and TemplesBrowser.tsx is under active edit by the imag |
| F087 | P1 | TD-01 | temples-darshan | partial | — | The larger half of the 37.5s is Render free-tier cold start on the web and API services, which the audit itself names as the likely contributor. Closi |
| F088 | P1 | TD-02 | temples-darshan | fixed | — | verified: Fix is real and the data behind it holds up. The hand-written fallbackScheduleTable with three literal `status |
| F096 | P0 | PF-01 | pandit-fulfilment | fixed | 1645e4da |  |
| F097 | P0 | PF-02 | pandit-fulfilment | fixed | 1645e4da |  |
| F098 | P0 | PF-03 | pandit-fulfilment | fixed | 1645e4da |  |
| F099 | P1 | PF-04 | pandit-fulfilment | fixed | — | verified: apps/web/__tests__/priest-fulfilment-p1.test.tsx — 2 tests, 2 red before (no button matchi |
| F100 | P1 | PF-05 | pandit-fulfilment | fixed | — | verified: apps/api/src/routes/priest-video-storage.test.ts — 3 tests, 2 red before (both asserted 50 |
| F101 | P1 | PF-06 | pandit-fulfilment | fixed | — | verified: apps/api/src/routes/priest-fulfilment.test.ts — 6 tests, 5 red before, 6 green after. Red: |
| F102 | P1 | PF-07 | pandit-fulfilment | fixed | — | verified: API apps/api/src/routes/priest-fulfilment.test.ts — 3 red before / green after (counts abs |
| F103 | P1 | PF-08 | pandit-fulfilment | fixed | — | verified: API — 4 tests, all red before (the route did not exist; the 404 case was strengthened to a |
| F104 | P1 | PF-09 | pandit-fulfilment | fixed | — | verified: apps/web/__tests__/priest-fulfilment-p1.test.tsx — 3 tests (list card, detail Schedule & L |
| F105 | P1 | PF-10 | pandit-fulfilment | fixed | — | verified: API — 2 tests red before / green after, asserting the Prisma select actually contains plat |
| F106 | P1 | PF-11 | pandit-fulfilment | fixed | — | verified: apps/api/src/routes/priest-fulfilment.test.ts — 3 tests, 3 red before / 3 green after: a b |
| F107 | P2 | PF-12 | pandit-fulfilment | fixed | — | verified: Change is real and complete. E:/NewClaude/bhaktisetu/apps/api/src/services/priest.service.ts:598 aggregates `w |
| F108 | P2 | PF-13 | pandit-fulfilment | partial | — | DISPUTED by verify: SCOPE OVER-CLAIM. The enum + clamp are real (apps/api/src/routes/priest.ts:58 z.nativeEnum(BookingStatus), :72 z.nativeEnum(PayoutStatus), page/limit  |
| F109 | P2 | PF-14 | pandit-fulfilment | fixed | — | verified: Change is real end to end. priest.service.ts:127-128 selects isOnDuty/lastSeenAt, :209-210 returns `priest.isO |
| F110 | P2 | PF-15 | pandit-fulfilment | partial | — | DISPUTED by verify: SCOPE OVER-CLAIM, and one sentence of the claim is false. The error/empty split is real on both screens and the tests are NOT vacuous — reverting the  |
| F111 | P2 | PF-16 | pandit-fulfilment | owner | — | (1) apps/api/prisma/seed.ts:934 still hardcodes `commissionRate: 0.70` on every seeded priest — so running db:seed after the migration silently re-cre |
| F115 | P0 | DB-01 | devotee-booking | fixed | — | server counts + pagination; also fixed non-total orderBy losing a row across pages |
| F116 | P1 | DB-02 | devotee-booking | fixed | — | already_fixed · apps/web/app/bookings/page.tsx:107-123 now declares `const map: Record<BookingStatus, {...}>` w |
| F117 | P1 | DB-03 | devotee-booking | fixed | — | verified: Both claimed halves are really there. apps/web/app/pujas/book/page.tsx:1029-1035 now names the reservation, qu |
| F118 | P1 | DB-04 | devotee-booking | fixed | — | verified: Verified in source, not just in the lib. apps/web/app/pujas/page.tsx:485 opens a real <form action="/pujas" me |
| F119 | P1 | DB-05 | devotee-booking | fixed | — | verified: Both schemas really carry it: requirePrasadDeliveryAddress at apps/api/src/routes/bookings.ts:768-779 is appli |
| F120 | P1 | DB-06 | devotee-booking | partial | — | DISPUTED by verify: The two named badges and the checkbox really were fixed (HEAD contains '100% Money-Back' in book/page.tsx and 'not satisfied' in [slug]/page.tsx; both |
| F125 | P0 | AO-01 | admin-ops | fixed | 1645e4da |  |
| F126 | P0 | AO-02 | admin-ops | fixed | — | bound to payout-requests/:id/process; found+avoided Commission-vs-PayoutRequest 404; 17 tests red first |
| F127 | P0 | AO-03 | admin-ops | fixed | — | refunds page + payouts + KYC + sidebar; 24 tests green, partial-refund ledger consequence shown pre-commit |
| F128 | P0 | AO-04 | admin-ops | fixed | 1645e4da |  |
| F129 | P1 | AO-05 | admin-ops | fixed | — | verified [named test VACUOUS; non-vacuity proven another way]: Fix is real: apps/web/app/admin/users/[id]/page.tsx now exists (528 lines, untracked new file), so the hrefs a |
| F130 | P1 | AO-06 | admin-ops | fixed | — | verified: apps/web/app/admin/users/view/page.tsx is now a 64-line redirect to /admin/users/<id>; the hardcoded `usersDb` |
| F131 | P1 | AO-07 | admin-ops | fixed | — | verified: Real fix, non-vacuous. New apps/web/app/admin/users/users-api.ts:126 fetchAllAdminUsers pages at limit=200 up  |
| F132 | P1 | AO-08 | admin-ops | fixed | — | verified: mapStatus (apps/web/app/admin/users/page.tsx:77) now derives status from raw.blocked plus a set of user ids fr |
| F133 | P1 | AO-09 | admin-ops | partial | — | Per-subscription rows (user, plan, dates, razorpay id) cannot be shown until apps/api/src/routes/admin-subscriptions.ts:24 is replaced with  |
| F134 | P1 | AO-10 | admin-ops | fixed | — | verified: The 700ms setTimeout handleSave is gone; the page was rewritten (941-line diff) as read-only. Verified in sour |
| F135 | P1 | AO-11 | admin-ops | fixed | — | verified: Genuine fix, proven red-without-it (revenue/page.tsx reverted to HEAD → 8/8 red, restored → 8/8 green). The ca |
| F136 | P1 | AO-12 | admin-ops | fixed | — | verified: Verified by reading every render site, not just the tests: grep for providerId/bookingId in apps/web/app/admin |
| F143 | P0 | AW-01 | astro-wellness | fixed | — | dashboard+consultations bound to real rows; fixed id-mismatch (profile.id vs user.id) that broke the DB endpoint too |
| F144 | P0 | AW-02 | astro-wellness | partial | — | funnel refuses non-approved astrologers (409); 138-line fixture array deleted; real supply owner-gated |
| F145 | P0 | AW-03 | astro-wellness | fixed | — | live directory built on real API; no fabricated fallback; mutation-checked |
| F146 | P1 | AW-04 | astro-wellness | fixed | — | verified: Fix is real on both sides. apps/api/src/routes/astrologer-portal.ts adds loadAstrologerLedger() and the /dashb |
| F147 | P1 | AW-05 | astro-wellness | fixed | — | verified: apps/web/lib/commission-api.ts:139 is COMMISSION_PAGE_SIZE = 100, down from 200; the provider route cap is con |
| F148 | P1 | AW-06 | astro-wellness | fixed | — | verified: apps/api/src/routes/consultation.ts:615-634 now wraps the status flip and reverseBookingLedger(tx, row.id, ... |
| F149 | P1 | AW-07 | astro-wellness | partial | — | DISPUTED by verify: Real but narrower than 'fixed', and one cited assertion is vacuous against the real contract. What IS shipped: apps/web/app/wellness/classes/{page,Wel |
| F150 | P1 | AW-08 | astro-wellness | partial | — | DISPUTED by verify: The middleware half is real and non-vacuous: apps/api/src/middlewares/auth.ts:160-181 replaces the synthetic-id fallback with a 401 naming the unseede |
| F151 | P1 | AW-09 | astro-wellness | partial | — | The owner must edit apps/api/.env by hand — this agent cannot. Both Write and Edit to that path are refused by the machine's credential-stor |
| F161 | P0 | S-01 | store-temple-gaushala | fixed | 1645e4da |  |
| F162 | P0 | S-02 | store-temple-gaushala | fixed | 1645e4da |  |
| F163 | P1 | S-03 | store-temple-gaushala | fixed | — | already_fixed · apps/api/src/server.ts:449-465 registers `server.setErrorHandler` which logs the full error int |
| F164 | P1 | S-04 | store-temple-gaushala | fixed | — | already_fixed · The /store controls are live. apps/web/app/store/page.tsx:90-91 parses the URL into filters and |
| F165 | P1 | S-05 | store-temple-gaushala | fixed | — | already_fixed · Donations now carry the key the portal filters on. apps/api/src/lib/gaushala-donee.ts collapses |
| F166 | P1 | S-06 | store-temple-gaushala | fixed | — | already_fixed · Both sides say why. API: apps/api/src/routes/temple-portal.ts:113 introduces `TempleLinkReason` |
| F167 | P1 | S-07 | store-temple-gaushala | fixed | — | already_fixed · The seller dead-end is gone. API: apps/api/src/routes/store-admin.ts adds GET /profile (returns |
| F168 | P1 | S-08 | store-temple-gaushala | fixed | — | already_fixed · The zeros are explained. apps/web/app/gaushala-portal/page.tsx:63-82 tracks `profileMissing` fr |
| F169 | P2 | S-09 | store-temple-gaushala | fixed | — | already_fixed · Closed by the COM-06/S-09 wave; no change made. git show HEAD:apps/web/app/store/checkout/page. |
| F170 | P2 | S-10 | store-temple-gaushala | fixed | — | already_fixed · Closed by an earlier wave; no change made. git show HEAD:apps/web/app/store/checkout/page.tsx:2 |
| F171 | P2 | S-11 | store-temple-gaushala | fixed | — | already_fixed · Closed by an earlier wave; no change made. git show HEAD:apps/web/app/store/checkout/page.tsx:1 |
| F172 | P2 | S-12 | store-temple-gaushala | owner | — | Owner-only, two parts. (1) ROTATE the exposed credentials — Supabase service-role key, the production JWT_SECRET, the Groq key and the Cohere key — si |
| F174 | P1 | LC-01 | list-controls | fixed | — | already_fixed · Closed by the S-04 fix. The sort <select> is now a real client control: E:/NewClaude/bhaktisetu |
| F175 | P1 | LC-02 | list-controls | fixed | — | already_fixed · The hero box is now inside a real <form role="search"> with name="q", a controlled value and a  |
| F176 | P1 | LC-03 | list-controls | fixed | — | already_fixed · Pills are real buttons with onClick -> go({category}) and the active style is driven by the sel |
| F177 | P1 | LC-04 | list-controls | fixed | — | already_fixed · Price band is a wired <select> (StoreFilterBar.tsx:145-158) backed by inBand() at E:/NewClaude/ |
| F178 | P1 | LC-05 | list-controls | fixed | — | already_fixed · Closed by A11Y-11. The CTA is now E:/NewClaude/bhaktisetu/apps/web/components/store/AddToCartBu |
| F179 | P1 | LC-06 | list-controls | fixed | — | already_fixed · Closed by DB-04 / PF-02. The four selects now sit in a real GET form with name attributes and d |
| F180 | P1 | LC-07 | list-controls | fixed | — | already_fixed · The dead 'Sort: Popularity' button is gone; it is now <select id="puja-sort" name="sort"> at E: |
| F181 | P2 | LC-08 | list-controls | fixed | — | already_fixed · Both chips are wired toggles with aria-pressed and an active style: E:/NewClaude/bhaktisetu/app |
| F182 | P1 | LC-09 | list-controls | fixed | — | verified: Both halves are real. app/gaushala/page.tsx:574-588 is now `<Link href={`/donations?planId=${plan.id}`}>` on a |
| F183 | P2 | LC-10 | list-controls | fixed | — | already_fixed · The page no longer calls getUsers(token) bare. E:/NewClaude/bhaktisetu/apps/web/app/admin/users |
| F184 | P2 | LC-11 | list-controls | owner | — | apps/api/** is on this cluster's explicit DO-NOT-TOUCH list (another agent owns it this wave). No API edit made. Note the fix is a pure service-layer  |
| F185 | P2 | LC-12 | list-controls | partial | — | The /astrology half is unfixed: apps/web/app/astrology/AstrologyClient.tsx:161-171 still has the identical router.replace-in-an-effect pattern (filter |
| F186 | P2 | LC-13 | list-controls | fixed | — | already_fixed · Closed by AW-02 and the fallback is gone entirely, not merely relabelled. E:/NewClaude/bhaktise |
| F187 | P2 | LC-14 | list-controls | partial | — | Publishing a post cannot be done in code without two owner decisions: (1) how drafts reach the runtime — make the repo publicly readable, supply a Git |
| F191 | P1 | DU-01 | design-uniformity | fixed | — | verified: Change is real and is exactly the fix the finding prescribes. globals.css:145-149 now declares --font-sans/--f |
| F192 | P1 | DU-02 | design-uniformity | fixed | — | verified: --shadow-warm-sm/--shadow-warm/--shadow-warm-md/--shadow-warm-lg are added to @theme (not :root), and the comp |
| F193 | P1 | DU-03 | design-uniformity | partial | — | Adoption. The CTA sprawl is at app/pujas/page.tsx, app/temples/**, app/store/page.tsx, app/pricing/page.tsx, app/admin/page.tsx, app/priest/page.tsx,  |
| F194 | P1 | DU-04 | design-uniformity | partial | — | 69 literal `bg-saffron-500` call sites across 44 files still paint #b87333 as a resting fill, and those files are out of lane. The token itself cannot |
| F195 | P1 | DU-05 | design-uniformity | partial | — | Entirely a call-site fix across 9 files. app/pujas/**, app/temples/**, app/store/**, app/pricing/**, app/admin/** are explicit DO-NOT-TOUCH this wave; |
| F196 | P2 | DU-06 | design-uniformity | partial | — | BUSINESS DECISION: no licensed display face is bundled. Buying/licensing Cabinet Grotesk (or choosing an alternative) and dropping the woff2 into publ |
| F197 | P2 | DU-07 | design-uniformity | partial | — | app/pujas/** and app/admin/** are explicit DO-NOT-TOUCH this wave; app/priest/page.tsx is outside my edit-only lane. Needs the same call-site owner as |
| F198 | P2 | DU-08 | design-uniformity | partial | — | app/store/** and app/temples/** are explicit DO-NOT-TOUCH this wave. The fix is promoting one existing h3 per page to h2 (the /store 'Sale' banner and |
| F199 | P2 | DU-09 | design-uniformity | partial | — | The other half of the finding — '16 distinct warm brand colours' — counts the temple-gold, amber, sandal and rudraksha ramps, which ARE declared palet |
| F200 | P2 | DU-10 | design-uniformity | partial | — | 676 hardcoded arbitrary sizes the token layer cannot reach: 364 text-[10px], 210 text-[11px], 102 text-[9px] across app/ and components/. Those are pe |
| F201 | P2 | DU-11 | design-uniformity | fixed | — | verified: Both halves of the finding are addressed exactly as its fix line asks. --font-body is now 'Satoshi', var(--fon |
| F202 | P2 | DU-12 | design-uniformity | partial | — | DISPUTED by verify: SCOPE OVER-CLAIM. The delivered half is real and verified — compiled CSS confirms --color-gray-50..950 are warm hexes and slate/zinc/neutral/stone ali |
| F206 | P0 | RESP-01 | responsive | partial | 376153d5 | space reserved, banner 347->321; Sign In still occluded |
| F207 | P1 | RESP-02 | responsive | fixed | — | already_fixed · Closed by commit 376153d5 "fix(web): stop the consent banner burying page content" (2026-08-13, |
| F208 | P1 | RESP-03 | responsive | fixed | — | already_fixed · Also closed by commit 376153d5. apps/web/components/MobileBottomTabs.tsx:57 now sets `style={{  |
| F209 | P1 | RESP-04 | responsive | fixed | — | verified: The change is real, correctly scoped and sound. components/home/NextFestivalStrip.tsx is the component the hom |
| F210 | P2 | RESP-05 | responsive | partial | — | The remaining 86 (min still 9px) are hardcoded arbitrary utilities no token can reach: 364 text-[10px], 210 text-[11px], 102 text-[9px] in source. The |
| F211 | P2 | RESP-06 | responsive | fixed | — | verified: Independently confirmed the mechanism rather than the measurement. All four controls the finding names are cov |
| F212 | P2 | RESP-07 | responsive | partial | — | The 'Forgot password?' link needs padding or min-h at its call site in apps/web/app/auth/login/page.tsx, which is outside my edit-only lane (globals.c |
| F213 | P2 | RESP-08 | responsive | fixed | — | verified: Outcome holds, but the stated justification is wrong and there is no RESP-08-specific coverage. I checked the  |
| F214 | P2 | RESP-09 | responsive | partial | — | app/page.tsx:347 and :488 and the puja-detail action row are call-site edits outside my edit-only lane. Fixing them from CSS is not possible without a |
| F215 | P2 | RESP-10 | responsive | partial | — | app/admin/** is explicit DO-NOT-TOUCH this wave; app/priest/** and app/layout.tsx are outside my edit-only lane (globals.css + components/ui/**). Need |
| F216 | P2 | RESP-11 | responsive | partial | — | I could not sign in as pandit@demo.com / admin@demo.com and visually confirm the on-duty toggle at 390px within this wave, and app/priest/page.tsx is  |
| F222 | P0 | LEG-02 | legal-content | partial | 1645e4da | same as COM-02 |
| F224 | P1 | LEG-04 | legal-content | partial | — | apps/web/app/pricing/** and apps/web/lib/pricing.ts are on my explicit do-not-touch list this session (the pricing-market agent is editing t |
| F225 | P1 | LEG-05 | legal-content | fixed | — | verified: apps/web/__tests__/legal-content-p1.test.ts + legal-content-p1-render.test.tsx. RED: 'drop |
| F226 | P1 | LEG-06 | legal-content | partial | — | DISPUTED by verify: The copy edits and the tests are real (reverting refunds/nri-ca/why-darshya fails all 6 LEG-06 cases), but 'fixed' over-claims and the claim's own jus |
| F227 | P1 | LEG-07 | legal-content | owner | — | Two blockers. (1) Lane: apps/web/app/bookings/view/page.tsx is not a legal or policy page and is not in my edit list; the devotee-booking ar |
| F228 | P1 | LEG-08 | legal-content | fixed | — | verified: apps/web/__tests__/legal-content-p1.test.ts. RED: 'does not promise 4 free pujas' failed ( |
| F229 | P1 | LEG-09 | legal-content | fixed | — | verified: apps/web/__tests__/legal-content-p1.test.ts. RED: '/nri leads with the INR amount that Raz |
| F230 | P1 | LEG-10 | legal-content | partial | — | Three separate blockers, none of which I can clear. (1) OWNER — the legal entity name, CIN, GSTIN and registered office are facts that do no |
| F231 | P1 | LEG-11 | legal-content | partial | — | OWNER — the officer's NAME, DESIGNATION and PHONE are the substance of the statutory requirement and I will not invent a person. Flip COMPAN |
| F232 | P1 | LEG-12 | legal-content | fixed | — | verified: legal-content-p1.test.ts + legal-content-p1-render.test.tsx. RED: 'company.ts owns the del |
| F233 | P2 | LEG-13 | legal-content | partial | — | DISPUTED by verify: Real and substantial, but narrower than the finding and it substitutes a new unverified claim. VERIFIED GOOD: apps/web/lib/live-stats.ts parses only t |
| F234 | P2 | LEG-14 | legal-content | fixed | — | verified: Both halves are real. apps/web/app/csr-match/page.tsx is a server component calling notFound() unless process. |
| F235 | P2 | LEG-15 | legal-content | partial | — | The persistent FOOTER link the finding names is NOT shipped. The footer lives in apps/web/app/layout.tsx and every entry is an i18n key resolved throu |
| F236 | P2 | LEG-16 | legal-content | partial | — | The third thing the finding names — 'confirm privacy@ and grievance@ actually deliver before publishing them' — is an owner/DNS action I cannot perfor |
| F237 | P2 | LEG-17 | legal-content | owner | — | Two blocks. (1) LANE: the render sites are apps/web/app/store/** and the data is apps/web/lib/products.ts, feeding lib/store-pricing.ts — app/store/** |
| F238 | P2 | LEG-18 | legal-content | fixed | — | verified: Both halves check out. apps/web/app/refunds/page.tsx section 9: step 1 links href="/bookings" (that route exis |
| F240 | P0 | PAR-01 | app-web-parity | fixed | — | real-payload selectors + screens rewired; 39 mobile tests, tsc clean |
| F241 | P0 | PAR-02 | app-web-parity | fixed | — | real-payload selectors + screens rewired; 39 mobile tests, tsc clean |
| F242 | P0 | PAR-03 | app-web-parity | fixed | — | real-payload selectors + screens rewired; 39 mobile tests, tsc clean |
| F243 | P0 | PAR-04 | app-web-parity | fixed | — | real-payload selectors + screens rewired; 39 mobile tests, tsc clean |
| F244 | P0 | PAR-05 | app-web-parity | fixed | — | real-payload selectors + screens rewired; 39 mobile tests, tsc clean |
| F245 | P0 | PAR-06 | app-web-parity | fixed | — | real-payload selectors + screens rewired; 39 mobile tests, tsc clean |
| F246 | P0 | PAR-07 | app-web-parity | fixed | — | real-payload selectors + screens rewired; 39 mobile tests, tsc clean |
| F247 | P1 | PAR-08 | app-web-parity | fixed | — | verified: apps/mobile/lib/__tests__/parity-contracts.test.ts 'PAR-08 selectPanchang' (4 tests, incl. |
| F248 | P1 | PAR-09 | app-web-parity | fixed | — | verified: parity-contracts.test.ts 'PAR-09 temple portal selectors' (4 tests, incl. one proving an o |
| F249 | P1 | PAR-10 | app-web-parity | fixed | — | verified: parity-contracts.test.ts 'PAR-10 selectWellnessSessions' (4) + 'PAR-10 buildWellnessSessio |
| F250 | P1 | PAR-11 | app-web-parity | fixed | — | verified: parity-contracts.test.ts 'PAR-11 selectPriestProfile' (4 tests, incl. one asserting bankLi |
| F251 | P1 | PAR-12 | app-web-parity | fixed | — | verified: parity-contracts.test.ts 'PAR-12 selectPortalCows' (4 tests, incl. one proving a PUBLIC-sh |
| F252 | P1 | PAR-13 | app-web-parity | partial | — | The server half is apps/api/src/routes/astrologer-portal.ts, explicitly outside my lane and being edited by another agent right now. Two thi |
| F253 | P1 | PAR-14 | app-web-parity | owner | — | Both files are in DO-NOT-TOUCH lanes (apps/web and apps/api) with other agents editing them. The fix is one of two one-liners and needs an o |
| F254 | P1 | PAR-15 | app-web-parity | partial | — | Two blockers, neither in my lane. (1) The endpoint constants live in packages/shared/src/constants/index.ts and the dead useCreateBooking in |
| F255 | P1 | PAR-16 | app-web-parity | fixed | — | verified: parity-contracts.test.ts 'PAR-16 store selectors' (5 tests: real rating/MRP/discount mappi |
| F256 | P1 | PAR-17 | app-web-parity | fixed | — | already closed by an earlier P0 fix · Dead. apps/mobile/app/(devotee)/temples.tsx:35 now builds `https://darshya.onlin |
| F257 | P1 | PAR-18 | app-web-parity | fixed | — | verified: parity-contracts.test.ts 'PAR-18 buildYatraInquiry' (5 tests: the built body satisfies the |
| F258 | P1 | PAR-19 | app-web-parity | fixed | — | verified: parity-contracts.test.ts 'PAR-19 describePlatformFlagSupport' (3 tests: canWrite is false  |
| F259 | P1 | PAR-20 | app-web-parity | fixed | — | already closed by an earlier P0 fix · Dead. apps/mobile/app/(admin)/reports.tsx:44-50 no longer promises an email: exp |
| F262 | P0 | CM-01 | customer-mindset | fixed | 1645e4da |  |
| F263 | P0 | CM-02 | customer-mindset | fixed | 1645e4da |  |
| F264 | P0 | CM-03 | customer-mindset | fixed | — | fees disclosed at all 3 advertised prices; 'Rs 0 hidden fees' -> 'All fees shown upfront'; folding fee into base is owner's call |
| F266 | P0 | CM-05 | customer-mindset | fixed | — | real completions only via existing popular endpoint; threshold 3; cannot fabricate (13 tests) |
| F267 | P0 | CM-06 | customer-mindset | fixed | — | shared delivery-address validator (55 countries); US/UK/UAE bookings 201 at identical INR; foreign-currency copy corrected |
| F268 | P1 | CM-07 | customer-mindset | fixed | — | verified: Change is real and matches the finding. apps/web/app/gift/page.tsx is now `export default async function` feed |
| F269 | P1 | CM-08 | customer-mindset | partial | — | Self-hosting/CDN needs lib/images.ts and next.config.* (both explicitly out of my lane) and is TASKS.md #203/#204. Real photography of actual priests  |
| F270 | P1 | CM-09 | customer-mindset | fixed | — | verified: Verified in apps/web/app/pujas/page.tsx:641-643: card container is now `<Link key={puja.id} href={`/pujas/${pu |
| F271 | P1 | CM-10 | customer-mindset | partial | — | DISPUTED by verify: SCOPE OVER-CLAIM marked 'fixed'. Half the finding is genuinely closed: lib/puja-labels.ts exists with real unit tests (special_occasion->'Special occa |
| F272 | P1 | CM-11 | customer-mindset | partial | — | DISPUTED by verify: The fix is INERT IN PRODUCTION for its main claim, and the test that covers it validates a payload shape the API never emits. lib/platform-stats.ts:ge |
| F273 | P1 | CM-12 | customer-mindset | partial | — | Not done: store products in the result set, cross-corpus relevance ranking, and 'nearest match' suggestions on zero results — those need an apps/api / |
| F274 | P1 | CM-13 | customer-mindset | partial | — | H1 rewrite ('Darshya, your bridge to sacred traditions' -> a job statement) lives in lib/i18n/en.json heroTitle1/heroTitle2, and lib/i18n/** + lib/t.t |
| F275 | P1 | CM-14 | customer-mindset | partial | — | The directory-level 'Darshan info only - pujas coming soon' badge and the 'Notify me when pujas open here' demand capture belong in app/temples/page.t |
| F276 | P2 | CM-15 | customer-mindset | partial | — | The remaining half is app/astrology/page.tsx, and app/astrology/** is explicitly on my do-not-touch list this wave. One shared card-grid skeleton comp |
| F277 | P2 | CM-16 | customer-mindset | fixed | — | already_fixed · Does not reproduce. app/pujas/page.tsx:327 computes `const filtersActive = hasActivePujaFilters |
| F278 | P2 | CM-17 | customer-mindset | fixed | — | verified: apps/web/app/not-found.tsx now carries a real GET form (`action="/search" method="get"`, `<label htmlFor="notf |
| F279 | P2 | CM-18 | customer-mindset | fixed | — | verified: This is the strongest-tested claim in the set — 3 of its 4 tests are real behavioural tests, not source greps. |
| F280 | P2 | CM-19 | customer-mindset | fixed | — | already_fixed · Closed by PM-03b/PM-08b in the same sweep, by the pricing agent. lib/pricing.ts COMMISSION_RATE |
| F281 | P2 | CM-20 | customer-mindset | partial | — | The finding's actual fix — 'a token change in the shared button styles' — is apps/web/app/globals.css and components/ui/**, both explicitly on my do-n |
| F282 | P0 | SCAL-01 | scalability | fixed | 4f90d0b9 |  |
| F284 | P0 | SCAL-03 | scalability | fixed | — | 9 indexes, applied in 1 tx (no 25001), planner verified on live DB |
| F285 | P1 | SCAL-04 | scalability | partial | — | DISPUTED by verify: Real work, non-vacuous tests (18 of 19 assertions go red when the five source files are reverted to HEAD), but 'fixed' materially over-states it on th |
| F286 | P1 | SCAL-05 | scalability | partial | — | Removing the remote call entirely needs the Supabase project JWT secret (Supabase dashboard -> Settings -> API -> JWT secret) set as an env  |
| F287 | P1 | SCAL-06 | scalability | fixed | — | verified: The headline defect is genuinely gone. apps/api/src/jobs/aarti-notify.ts no longer contains the loop-invariant |
| F288 | P1 | SCAL-07 | scalability | fixed | — | verified: The change is real and does what it claims at the unit level. apps/api/src/lib/ensure-schema.ts now sha256-fin |
| F289 | P1 | SCAL-08 | scalability | fixed | — | verified: The fix is real and is exactly the second option the audit offered. apps/api/src/lib/cache.ts adds a bounded ( |
| F290 | P2 | SCAL-09 | scalability | partial | — | NOT DONE: the search half. `CREATE EXTENSION IF NOT EXISTS pg_trgm;` plus GIN trigram indexes on users(full_name) and users(email) require a Prisma mi |
| F291 | P2 | SCAL-10 | scalability | owner | — | OWNER DECISION: which service gets the 750 free instance-hours, and whether to spend. The three options, with the numbers: (a) move the web front end  |
| F292 | P2 | SCAL-11 | scalability | partial | — | OWNER DECISIONS, none of which are code: (1) buy the paid Resend tier ($20/mo for 50k) as a launch-day line item; (2) decide where digest/drip/marketi |
| F295 | P0 | A11Y-01 | accessibility | fixed | — | contrast recomputed; 19-assertion test, 14 red first |
| F296 | P0 | A11Y-02 | accessibility | fixed | — | contrast recomputed; 19-assertion test, 14 red first |
| F297 | P0 | A11Y-03 | accessibility | fixed | — | mega-menu keyboard operable; 30 tests green, tsc finished after agent died |
| F298 | P0 | A11Y-04 | accessibility | fixed | — | drawer focus trap + restore + inert when closed |
| F299 | P0 | A11Y-05 | accessibility | fixed | — | contrast recomputed; 19-assertion test, 14 red first |
| F300 | P1 | A11Y-06 | accessibility | fixed | — | verified: Real and non-vacuous. apps/web/app/auth/login/page.tsx:506-509 now carries id/name="email"/autoComplete="email |
| F301 | P1 | A11Y-07 | accessibility | fixed | — | verified: Real and non-vacuous. apps/web/app/auth/login/page.tsx:557-558 adds aria-label={showPassword ? 'Hide password' |
| F302 | P1 | A11Y-08 | accessibility | partial | — | The three remaining halves of this finding — the <ol>/aria-current step indicator, the step-change live region + focus move to the new step  |
| F303 | P1 | A11Y-09 | accessibility | partial | — | DISPUTED by verify: SCOPE OVER-CLAIM. The component work in apps/web/components/ui/DateInput.tsx is real and its test is non-vacuous (8/8 green; git checkout HEAD on the  |
| F304 | P1 | A11Y-10 | accessibility | partial | — | DISPUTED by verify: SCOPE OVER-CLAIM, and the test is scoped to match the fix rather than the finding. The finding's own 'where' is 'bg-saffron-500 used 70 times / 44 fil |
| F305 | P1 | A11Y-11 | accessibility | fixed | — | verified: Real, non-vacuous, and no fabricated success. apps/web/app/store/page.tsx: the card <a> wrapper became a <div  |
| F306 | P1 | A11Y-12 | accessibility | fixed | — | verified: Real and non-vacuous, and it goes beyond what the finding asked for. apps/web/components/GlobalSearch.tsx now  |
| F307 | P2 | A11Y-13 | accessibility | fixed | — | already_fixed · Closed by the A11Y-04 work already in the tree (uncommitted). apps/web/components/MobileNavV2.t |
| F308 | P2 | A11Y-14 | accessibility | fixed | — | verified: Exactly the one-line fix the finding prescribes, mirroring the desktop CategoryNav.tsx:156 pattern: components |
| F309 | P2 | A11Y-15 | accessibility | partial | — | app/store/** and app/admin/** are explicit DO-NOT-TOUCH this wave; app/auth/login/page.tsx and app/layout.tsx are outside my edit-only lane (globals.c |
| F310 | P2 | A11Y-16 | accessibility | partial | — | apps/api/** is on this wave's explicit DO-NOT-TOUCH list. Hand to the API-lane agent: apps/api/src/server.ts:166, extend the non-production fallback t |
| F311 | P0 | I-01 | i18n | fixed | — | locale param + CATALOGS + honest fallback flag; 33 tests |
| F312 | P0 | I-02 | i18n | partial | — | localeHref preserves locale on onward links; only hi has a catalog |
| F313 | P1 | I-03 | i18n | partial | — | components/LanguageSwitcher.tsx and components/ContentPageHeader.tsx are another agent's lane. Remaining work there is pure wiring against copy that a |
| F314 | P1 | I-04 | i18n | partial | — | apps/api/src/lib/error-i18n.ts + apps/api/src/routes/** are another agent's lane. Same root cause and same one-line choke point as I18N-03. |
| F315 | P1 | I-05 | i18n | partial | — | The server-rendered `lang="en"` literal at apps/web/app/layout.tsx:265 — owned by the app/layout agent. Until it is driven from the route's first path |
| F316 | P1 | I-06 | i18n | partial | — | apps/web/app/layout.tsx (next/font declarations) and apps/web/app/globals.css:195-197 are another agent's lane. Add the Noto_Sans_{Tamil,Telugu,Bengal |
| F317 | P1 | I-07 | i18n | partial | — | apps/web/app/temples/[slug]/page.tsx and the temples list/card components are another agent's lane. Fix is to stop discarding the API value and render |
| F318 | P2 | I-08 | i18n | partial | — | Remaining, deliberately not shipped: (1) no server-side redirect from '/' to '/{locale}' and (2) no `i18n` block in apps/web/next.config.ts — both wai |
| F319 | P2 | I-09 | i18n | partial | — | Lane. The brief's DO NOT TOUCH covers everything in apps/web outside lib/i18n/**, lib/t.ts, LangLanding.tsx, TranslationCoverageNotice.tsx, app/hi/**  |
| F321 | P2 | I-11 | i18n | partial | — | Lane. Four of the five sites are DO-NOT-TOUCH (apps/web/app/layout.tsx, components/LanguageSwitcher.tsx, lib/support.ts) or in apps/api (routes/users. |
| F322 | P0 | I18N-01 | i18n | fixed | — | wave2: cd apps/web && npx vitest run __tests__/i18n-locale.test.ts (RED 4 failed / 42 passed -> G |
| F323 | P1 | I18N-02 | i18n | fixed | — | already_fixed · Does NOT reproduce. apps/web/lib/t.ts:107 is now `function build<N extends Namespace>(ns: N, lo |
| F324 | P1 | I18N-03 | i18n | partial | — | apps/api/src/server.ts:449 is another agent's lane. Fix is to accept `req`, compute pickLang(req.headers['accept-language'], req.query?.lang) once, an |
| F325 | P1 | I18N-04 | i18n | partial | — | Reconciling the other four lists needs apps/api/src/lib/error-i18n.ts (add bn+mr catalogs or drop kn), components/LanguageSwitcher.tsx:8, and the Pris |
| F326 | P2 | I18N-05 | i18n | partial | — | Lane — components/LanguageSwitcher.tsx and components/ContentPageHeader.tsx are both DO-NOT-TOUCH, and the finding's own fix ('delete CONTENT_LABELS,  |
| F327 | P2 | I18N-06 | i18n | partial | — | Lane — app/layout.tsx and app/globals.css are both DO-NOT-TOUCH. Remaining work is mechanical and needs one owner of those two files: add Noto_Sans_Ta |
| F328 | P2 | I18N-07 | i18n | partial | — | Lane — apps/api is entirely off-limits to this agent and apps/web/app/profile/page.tsx is DO-NOT-TOUCH. Remaining: echo the stored value (or resolve d |
| F329 | P2 | I18N-08 | i18n | partial | — | Lane — apps/web/app/layout.tsx is DO-NOT-TOUCH. Remaining: delete the seven hardcoded <link rel="alternate"> tags from the root layout and emit altern |
| F330 | P2 | I18N-09 | i18n | partial | — | Lane — lib/help-articles.ts, app/help/** and app/sitemap.ts are all DO-NOT-TOUCH. Near-term code slices for whoever owns them: link a HELP_LANGS-drive |
| F333 | P0 | NOTIF-01 | notifications | fixed | — | in-process scheduler + /ops/scheduler staleness; 13 tests |
| F334 | P0 | NOTIF-02 | notifications | fixed | — | ::uuid cast + honest 500; side-by-side instance proof; 6 tests, 5 red first |
| F336 | P0 | NOTIF-04 | notifications | fixed | — | wired into both refund rails post-commit; honest per-channel outcomes |
| F337 | P0 | NOTIF-05 | notifications | fixed | — | videoReadyEmail + notifyVideoReady on both video_uploaded paths |
| F338 | P1 | NOTIF-06 | notifications | partial | — | The `in_progress` and `completed` transitions are set in apps/api/src/services/booking.service.ts (updateBookingStatus) and apps/api/src/rou |
| F339 | P1 | NOTIF-07 | notifications | partial | — | The actual defect is the WRITE in apps/web/components/AartiOptIn.tsx:99-101, which is off-limits this session (apps/web/**). The API now ref |
| F340 | P1 | NOTIF-08 | notifications | fixed | — | verified: apps/api/src/jobs/aarti-notify.test.ts (new, 10 tests) — RED 7 failed / 3 passed; the wind |
| F341 | P1 | NOTIF-09 | notifications | partial | — | DISPUTED by verify: The code change and the tests are real — the global `aartiOptIn: true` branch is deleted and the only token query is now `where: { userId: { in: follo |
| F342 | P1 | NOTIF-10 | notifications | fixed | — | verified: apps/api/src/services/dispatch-offer-timeout.test.ts (new, 9 tests) — RED all 9 failed; GR |
| F343 | P1 | NOTIF-11 | notifications | fixed | — | verified: apps/api/src/routes/cron.test.ts (new, 8 tests) — RED 7 failed / 1 passed (the surviving o |
| F344 | P1 | NOTIF-12 | notifications | fixed | — | verified: apps/api/src/jobs/panchang-blast.test.ts (new, 6 tests) — RED 6/6 failed ('tickPanchangBla |
| F345 | P1 | NOTIF-13 | notifications | partial | — | DISPUTED by verify: Three of the four parts are genuinely fixed and I verified them: fetchUpcomingAartisForBatch (weekly-digest.ts:210-245) joins temple_follows once with |
| F346 | P1 | NOTIF-14 | notifications | partial | — | Two slices sit outside the lane. (1) A proper Prisma model — apps/api/prisma/** is off-limits this session, so the table is created by lazy  |
| F349 | P0 | RES-01 | resilience | partial | c75fb12d | 233 bare fetch sites remain, concentrated in lib/temple-api.ts (12), lib/pandit-api.ts (8), lib/wellness-api.ts / lib/subscription-api.ts / lib/store- |
| F350 | P1 | RES-02 | resilience | partial | — | DISPUTED by verify: The banner+Retry work is real and the test is NOT vacuous — I reverted temple-portal's `setLoadError(loadErrorMessage(r))` to `if (!r.ok) return;` and |
| F351 | P1 | RES-03 | resilience | fixed | — | verified: Both guards are real and both are independently proven non-vacuous. (1) Reverting apps/web/app/profile/page.ts |
| F352 | P1 | RES-04 | resilience | partial | — | apps/web/app/pujas/book/page.tsx is in another agent's lane (app/pujas/**). Its fix is now a two-line change: delete the local loadRazorpay at :377-38 |
| F353 | P1 | RES-05 | resilience | fixed | — | verified: Verified end to end. booking.service.ts:630-662 does the natural-key lookup INSIDE the $transaction after lock |
| F354 | P1 | RES-06 | resilience | fixed | — | verified: All four claimed portals verified by reading: priest/page.tsx:127, gaushala-portal:65 and astrologer-portal:11 |
| F355 | P2 | RES-07 | resilience | fixed | — | verified: Change is real and matches the finding's prescribed fix. apps/web/lib/friendly-error.ts gains serverErrorMessa |
| F356 | P2 | RES-08 | resilience | fixed | — | verified: All three prescribed mitigations are present in BOTH loops of apps/web/components/Inbox.tsx, as claimed. (1) i |
| F357 | P2 | RES-09 | resilience | partial | — | NOT DONE: /dashboard and the six provider portals (payouts, temple-portal, astrologer-portal, wellness-portal, gaushala-portal, store-admin) that the  |
| F358 | P2 | RES-10 | resilience | fixed | — | verified: Verified in source and by behavioural test. send() now has both the missing else (non-2xx -> setSendFailed(tru |
| F359 | P2 | RES-11 | resilience | fixed | — | verified: The fix itself is real and I verified it by reading both files, not by trusting the tests. apps/web/app/priest |
| F360 | P2 | RES-12 | resilience | fixed | — | verified: Change is real and the causal chain holds end to end. New apps/api/src/lib/pagination.ts exports clampPage (no |
| F362 | P0 | DI-01 | data-integrity | fixed | 1645e4da | already_fixed · apps/api/src/services/ledger-reversal.service.ts now holds reverseBookingLedger as a leaf modul |
| F363 | P1 | DI-02 | data-integrity | partial | — | DISPUTED by verify: The core is real: reduceBookingLedgerForPartialRefund exists (ledger-reversal.service.ts:144-225), is called from BOTH rails (payment.service.ts:1324  |
| F364 | P1 | DI-03 | data-integrity | fixed | — | verified: payoutMultiplier and multiplyMoney are genuinely deleted — a repo-wide grep of apps/api/src returns only the e |
| F365 | P1 | DI-04 | data-integrity | fixed | — | verified: Verified in source: one `byUser` map keyed on User.id (admin-bookings.ts:211-240); the priest rail resolves Pr |
| F366 | P1 | DI-05 | data-integrity | partial | — | DISPUTED by verify: The mint itself is real and non-vacuous: booking.service.ts:887-921 fires on EARNING_ATTACH_STATUSES (:344-350, correctly excluding 'confirmed' and ev |
| F367 | P2 | DI-06 | data-integrity | owner | — | Needs a Prisma migration. apps/api/prisma/schema.prisma and prisma/migrations/** are serialised to another agent this session, so I stopped as instruc |
| F368 | P2 | DI-07 | data-integrity | owner | — | Needs a Prisma migration (schema.prisma + prisma/migrations/** are owned by another agent this session). TWO PARTS, and the first one is safe while th |
| F369 | P2 | DI-08 | data-integrity | partial | — | NOT DONE: the consumer labels. apps/web/app/admin/revenue/page.tsx:316 still renders the value under the label 'Commissions Earned', apps/web/app/admi |
| F372 | P0 | SEO-01 | seo-perf-budget | fixed | — | root canonical removed; 39 static + 13 dynamic self-canonicals; 53 offenders red first |
| F373 | P0 | SEO-02 | seo-perf-budget | fixed | — | C:/Program Files/Git/_next/ unblocked in robots.ts |
| F374 | P0 | PERF-01 | seo-perf-budget | fixed | — | 94,660->6,891 KB across 6 pages (-92.7%); prod-build measured |
| F375 | P1 | PERF-02 | seo-perf-budget | fixed | — | verified: Change is real. app/layout.tsx no longer contains any <link rel=preload as=image>, no fetchPriority=high, and  |
| F376 | P1 | PERF-03 | seo-perf-budget | partial | — | Self-hosting the brand faces. Downloading and licensing Satoshi + Cabinet Grotesk woff2 into public/fonts and declaring them via next/font/local is th |
| F377 | P1 | SEO-03 | seo-perf-budget | partial | — | The second half of the finding — 1,308 of 1,785 titles exceed 60 characters — is editorial copy work across 160+ pages, not a mechanical transform, so |
| F378 | P1 | SEO-04 | seo-perf-budget | fixed | — | verified: Change is real and the mechanism claim checks out against the installed resolver, which I read myself (next 15 |
| F379 | P1 | SEO-05 | seo-perf-budget | fixed | — | verified: Both fabrications are gone and both are guarded. app/pujas/[slug]/page.tsx no longer computes lowestPrice or ` |
| F380 | P1 | SEO-06 | seo-perf-budget | fixed | — | verified: The consolidation is real: lib/temple-slug.ts is the single normaliser, imported by app/temples/[slug]/page.ts |
| F386 | P0 | CWV-01 | seo-perf-budget | partial | — | measured: LCP fails all 4 pages (improved 0.85-4.4s), CLS PASSES (audit claim wrong), TBT now binding = JS not images |
