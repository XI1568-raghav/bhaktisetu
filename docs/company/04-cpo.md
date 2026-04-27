# CPO — Darshya Product Roadmap (30 / 60 / 90)

> Written 2026-04-27. Grounded in actual code state, not the deck.
> Source of truth: `apps/api/src/server.ts` (route prefixes), `apps/web/app/**/page.tsx` (surfaces), `docs/launch-state.md`, `docs/mobile-plan.md`.

---

## 1. Feature inventory — what's actually shipped

| Surface | State | Evidence |
|---|---|---|
| Puja booking | **Partial** — flow real up to Razorpay; on API failure path silently falls back to a fake order | `apps/web/app/pujas/[slug]/book/page.tsx:410` (mock slot availability), `:549-552` (mock order id when API errors). Route real: `apps/api/src/routes/bookings.ts:33` ships `pending_payment → confirmed` lifecycle |
| Live darshan | **Partial / cosmetic** — UI live, but stream URLs are YouTube embeds in fallback data, not AWS IVS | `apps/web/app/darshan/page.tsx:32-58` hardcoded `youtube.com/embed/...` fallback; `apps/api/src/routes/darshan.ts` is real but un-populated |
| Store (commerce) | **Partial** — catalog real (PRODUCTS list), checkout creates `pending_payment` order, no Medusa fulfilment wired | `apps/web/app/store/page.tsx:3` imports `lib/products` (static), `apps/api/src/routes/store.ts:135` writes `pending_payment` |
| Astrology | **Mocked** — astrologer list is hardcoded, consultations page uses `mockConsultations` | `apps/web/app/astrologer-portal/page.tsx:18`, `consultations/page.tsx:37,87` |
| Wellness | **Mocked** — instructor + session lists are inline arrays; portal screens labelled `// Mock Data` | `apps/web/app/wellness/page.tsx:54-60`, `wellness-portal/page.tsx`, `wellness-portal/students/page.tsx` |
| Gaushala | **Mocked** — gaushala list hardcoded "matches API"; donation flow exists but no 80G receipt linkage from this surface | `apps/web/app/gaushala/page.tsx:27-30`. Real 80G receipt lives in `apps/api/src/lib/pdf-receipt.ts` but only wired to `/donations` |
| Content (blog/articles) | **Shipped** — Sanity-backed, semantic search live | `apps/api/src/routes/{content,semantic-search}.ts`, pgvector migration applied 2026-04-26 |
| Panchang | **Shipped** — `mhah-panchang` real lib, fallback data only when SSR errors | `apps/web/app/panchang/page.tsx:32` ("Fallback data" comment, real source on success) |
| Messages / inbox | **Shipped — but fragile** — gated on bookings not in `pending_payment` | `apps/api/src/routes/conversations.ts:93` excludes `pending_payment`; UI at `apps/web/app/messages/page.tsx` |
| Admin (users/revenue/reports/approvals/settings) | **Mocked** — five admin pages are pure UI on hardcoded arrays | `apps/web/app/admin/{users,revenue,reports,approvals,settings,page}.tsx` all `// Mock Data` |
| Subscription / earnings settings | **Mocked** | `apps/web/app/settings/{subscription,earnings}/page.tsx` use `MOCK_*` constants |
| Yatra | **Mock book flow** | `apps/web/app/yatra/[slug]/book/page.tsx` |
| Mobile app | **Shell only** — 9 devotee tabs hardcoded, zero auth, zero API calls | `docs/mobile-plan.md` lines 8-15 |

The pattern: **happy-path public surfaces are real or close to real; portals (priest/astrologer/wellness/gaushala/admin) are demo-grade**. We can show a deck. We cannot put a paying NRI through the funnel without something breaking.

---

## 2. 30-day roadmap (next ~4 weeks)

Ranked by user-impact ÷ build-cost. "User" = the NRI puja-booker the steelman in `docs/strategy/appsforbharat-steelman.md` flagged as the only paying segment in the 12-month window.

### #1 — Kill the silent mock fallback in puja booking (8h)
- **Who feels it**: Every paying NRI. Today, when our API hiccups, the user "buys" a non-existent booking and sees a confirmation. Razorpay later reconciles to nothing.
- **Files**: `apps/web/app/pujas/[slug]/book/page.tsx:410-417` (slot mock), `:549-552` (order mock). Replace with proper error UI; surface to Sentry.
- **Why now**: This is the single biggest credibility-shredder we ship. It's 8 hours, and it touches money.

### #2 — Daily-trigger habit surface: panchang push + sunrise aarti notification (12h)
- **Who feels it**: Every signed-in user. Steelman §3 flags this as the single most important Sri-Mandir rebuttal. We have VAPID + cron infra already.
- **Files**: `apps/api/src/routes/cron.ts` (add daily fan-out), `apps/api/src/lib/web-push.ts` (already exists), `apps/web/components/NotificationPrompt.tsx` (add daily-aarti opt-in toggle), new `apps/api/src/services/daily-trigger.service.ts`. Use existing `mhah-panchang`.
- **Why now**: Retention tripwire (NRI Day-30 < 25%) is one of two that triggers a forced pivot. Daily push is the cheapest retention lever we have.

### #3 — 80G receipt on every donation surface, not just `/donations` (6h)
- **Who feels it**: NRI donors at gaushala, temple-portal donations, and direct donations. Today only the `/donations` create-order flow generates the PDF.
- **Files**: `apps/api/src/routes/gaushala.ts`, `apps/api/src/routes/temple-portal/donations.ts` callsites, reuse `apps/api/src/lib/pdf-receipt.ts`. Add a "Download 80G" button to confirmation states.
- **Why now**: 80G is one of the four NRI hooks (steelman). Currently shipped on one surface; needs to be on all three.

### #4 — Replace darshan YouTube fallbacks with at least 3 real IVS streams or scheduled-only mode (10h)
- **Who feels it**: Any user who clicks "Live Darshan" expecting a real temple feed. Today fallback YouTube embeds run when API is empty — looks like a stream from "us".
- **Files**: `apps/web/app/darshan/page.tsx:32-100` (remove fallback), `apps/api/src/routes/darshan.ts` (seed 3 real IVS channels OR switch to "Schedule next live" UI when none active).
- **Why now**: Either ship real darshan or admit we don't have it. The current state — embedded third-party YouTube as if ours — is dishonest and a takedown risk.

### #5 — De-mock the priest review surface (4h)
- **Who feels it**: Every priest checking their reputation. Currently shows fake 5-star reviews — they will notice on day one and lose trust.
- **Files**: `apps/web/app/priest/reviews/page.tsx:21-23,116`. Wire to `/api/v1/ratings` (route already exists, line 44 of server.ts).

**Total: ~40h. Doable in a focused 30 days for a 1-engineer team.**

---

## 3. 60-day roadmap — three bigger bets, founder must agree

These are forks, not items. Pick the fork before scoping.

### Bet A — Mobile parity Phase 1 + 2 only (~10h, gated by founder)
**Strategic fork**: Do we ship a real mobile app to the App Store in this window, or do we keep mobile as a PWA-only surface and let the Expo app rot?

If yes: `docs/mobile-plan.md` Phase 1+2 only (auth + devotee tabs wired to real API). Skip portals. Risk: Apple/Play approval cycle eats 2 weeks of clock.

### Bet B — NRI annual subscription, real Stripe (~20h, gated by founder)
**Strategic fork**: Do we sell a $99/year NRI bundle now, or stay transactional?

The steelman tripwire #3 (annual:per-puja revenue ratio) requires this to be live by week 12 or the prepay thesis is dead. We have Stripe in stack but no subscription product. Files: new `apps/api/src/routes/subscriptions.ts` (currently a stub), `apps/web/app/pricing/page.tsx`, `apps/web/app/settings/subscription/page.tsx` (currently mocked).

### Bet C — De-mock astrology OR delete it (~25h or ~2h)
**Strategic fork**: Astrology is a `mockConsultations` page today. Either we wire Jitsi (already in stack), real astrologer onboarding, payment, and 1-on-1 booking — **or we delete the surface from the nav** until we have a real partner.

A hybrid astrology marketplace is a 200-hour build. We do not have 200 hours. Pick: real partnership-driven launch with 5 astrologers, or remove from launch SKU per steelman §1.

---

## 4. 90-day roadmap — the big rock

**One concrete defensible thing: video-proof puja in under 24 hours, NRI-pay-in-USD, with 80G PDF auto-emailed — end-to-end, no mocks.**

Not "delight devotees". Not "best UX". A measurable claim: *"Book a puja from California at 9pm; by 9pm tomorrow you have a 4K video file in your inbox and a tax-deductible 80G receipt."* Every other Indian temple-booking app is 7-10 day turnaround with no video and no 80G. This is a knife-edge differentiator that maps directly to the four NRI hooks.

What this requires (concrete): priest video upload SLA gating in `bookings.ts` lifecycle, R2/Supabase Storage chunked upload (already built), automated 80G email on `video_uploaded` transition, NRI Stripe rail (Bet B above), and a hard "money back if not in 24h" promise in T&C. Engineering load: maybe 40h. Operational load (recruiting priests willing to commit to 24h SLA): real, founder-led.

This is defensible because AppsForBharat / Sri Mandir / VAMA cannot match it without restructuring their priest network. It's a process moat, not a tech moat.

---

## 5. Surfaces to kill (do not ship in current state)

- `apps/web/app/admin/{users,revenue,reports,approvals,settings}/page.tsx` — five admin pages on hardcoded mocks. Hide behind feature flag or remove from nav until `/api/v1/admin` returns real data. Today, an admin sees fake users.
- `apps/web/app/settings/subscription/page.tsx` — entire page is `MOCK_*` constants. Hide until Bet B ships.
- `apps/web/app/settings/earnings/page.tsx` — `MOCK_TRANSACTIONS`. Priest sees fictional earnings. Hide.
- `apps/web/app/wellness-portal/students/page.tsx` and `apps/web/app/astrologer-portal/consultations/page.tsx` — both labelled `Mock Data`. Hide portals until Bet C resolves.
- `apps/web/app/yatra/[slug]/book/page.tsx` — mocked book flow. Either de-mock or remove yatra from launch SKU (steelman recommends compress).
- `apps/web/app/darshan/page.tsx` fallback YouTube streams — remove and ship "no streams active" empty state until real IVS feeds exist.

These six removals are a half-day total. They make the demo honest.

---

## 6. PRD — Top 30-day item: kill silent mock fallback in puja booking

**Problem**: When `/api/v1/bookings/create-order` fails or times out, `apps/web/app/pujas/[slug]/book/page.tsx:548-552` catches the error and constructs a fake `orderId` + `razorpayOrderId` client-side. The booking flow then continues to Razorpay checkout against a non-existent order. If Razorpay returns success, the user has paid for a booking the API does not know about. There is no reconciliation.

**Users affected**: All booking users. Likelihood scales with API uptime — Render free tier cold-starts cause this. NRI users (slow trans-Pacific links) hit this disproportionately.

**Acceptance criteria**:
1. On any `create-order` failure the user sees an explicit "Booking unavailable, please retry — you have not been charged" UI; no Razorpay modal opens.
2. No code path constructs an `orderId` or `razorpayOrderId` client-side.
3. Failure events are reported to Sentry with `tag: booking-create-failed` and the puja slug.
4. Razorpay handler refuses to verify payments whose `order_id` was not returned by our API in the current session (defense-in-depth — handler stores the API-issued id in a closure, asserts equality before calling `/verify-payment`).
5. E2E test: with API stopped, clicking "Pay Now" must not open the Razorpay modal.

**Edge cases**:
- API returns 200 with a malformed body — treat as failure, do not proceed.
- User retries within 30s — must produce a *new* server-issued order, not reuse a stale one. Backend already enforces this; client must not cache.
- Network drops mid-handler — Razorpay webhook is the source of truth; client UI shows "Verifying — check email in 2 minutes" rather than success.
- Demo-pay path (`apps/api/src/routes/demo-pay.ts`, `server.ts:125`) must remain explicit, gated on `demo-*` user id.

**API schema** (no change required — this is a client fix):
```
POST /api/v1/bookings/create-order
  Body: { pujaId, templeId, slotId, devotees[], sankalp?, prasadDelivery? }
  200:  { orderId, razorpayOrderId, amount, currency }
  4xx:  { error, message }   // client must surface, not swallow
  5xx:  { error, message }   // client must retry-once-then-surface

POST /api/v1/bookings/verify-payment
  Body: { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId }
  200:  { booking: {...} }
```

**Rollout plan**:
1. Land behind `NEXT_PUBLIC_BOOKING_STRICT=true` flag for 48h on prod.
2. Monitor Sentry `booking-create-failed` rate. If > 2% of attempts, fix API uptime first (likely Render cold start; warm with cron ping) before flipping default.
3. Flip default to strict after 48h clean.
4. Remove the `// Mock order for demo` block entirely after one week of strict-mode green.

---

## Tradeoffs the founder must call

These block the roadmap above. Only the founder can answer.

1. **Compress launch SKU per steelman §1?** Drop wellness, gaushala-as-revenue, e-commerce store from launch-critical — yes or no? 60-day Bet C depends on this.
2. **Subscription before transactional revenue, or transactional first?** Bet B ($99 NRI annual) requires committing to a price now, before we have NRI cohort retention data. Tripwire #3 says we must do it by week 12 anyway. Do we ship it in week 6 (riskier price point) or week 11 (less data)?
3. **Mobile App Store this quarter, or PWA-only?** Bet A consumes 10-15h of engineering and 2 weeks of clock for review. Worth it pre-revenue?
4. **Astrology: real partnerships, or kill?** No third option that is honest at $0 budget.
5. **24-hour video-proof SLA — operational commitment?** The 90-day rock is technically ~40h. The hard part is recruiting priests who will sign a 24h SLA. Is the founder personally going to do that recruiting in May–June, or do we soften the claim?
6. **Are we comfortable removing six surfaces from the nav this week?** Five admin pages, subscription, earnings, yatra-book, wellness/astrologer portals. The site will look smaller. The site will also stop lying.
