# CPO Advisory — 2026-W36

> Auto-generated weekly. Decision Agent reads this. Founder override OK.

## Owned items snapshot
- Total: 33
- Planned: 0
- In progress: 7
- Shipped: 25
- Verified: 0
- Blocked: 1

## Top 5 ready-to-ship (revenue/hour desc)
_None ready (DAG blocked or all in progress)_

## Founder-blocked
- R-Q1-E-009 blocked by U8: 3 A/B feature flags hero_copy/cta_color/nri_lane
- R-Q2-CS-003 blocked by native-speaker review for ta/te/bn/mr + Wati Meta template approval: Multilingual macros — Tamil + Telugu + Bengali + Marathi support templates
- R-Q2-P-005 blocked by U3: iOS TestFlight — internal beta w/ 50 testers + crash reporting
- R-Q2-P-006 blocked by U5: Push notifications strategy — daily aarti + festival + booking-status

## Live KPIs (this role)
- posthog:nps_score: undefined (STALE)

## Dept doctrine (top 30 lines of 04-cpo.md)
```
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
```

## Recommended next-cycle prompts for Decision Agent
_Defer to founder — all CPO items either in flight or blocked_
