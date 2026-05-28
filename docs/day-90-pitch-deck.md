# Darshya — Day-90 Pitch Deck Outline

> Working draft for seed conversations. 12 slides. Last updated 2026-05-28 (Sprint 3 close).

## Slide 1 — Title

- **Darshya** — Devotional super-app for India + 32M NRI diaspora.
- One line: "Book pujas with video proof. Watch live darshan. Donate with 80G. Anywhere on earth."
- Founder name + city + email + darshya.online QR.

## Slide 2 — Problem

- 1.2B Hindus, 32M NRI. No trusted way to participate in temple rituals remotely.
- Existing apps (Sri Mandir, Utsav, AppsForBharat) cover content + lite donations. **No video proof. No NRI lane. No real seva.**
- NRI segment (US/UK/CA/AU/Gulf) overpays for unverifiable WhatsApp puja brokers ($100–$500/puja).

## Slide 3 — Solution

- **Video-proof puja booking** — every booking ships verified MP4 to devotee.
- **Live darshan** — 6 temples streaming today, IVS + YouTube fallback.
- **NRI-priced dual lane** — INR for domestic, USD via Stripe for diaspora at 9-10× margins.
- **80G donation rail** — gaushala + temple seva with PAN-backed receipts.
- **Astrology + wellness + yatra + store** — full devotional surface in one app.

## Slide 4 — Traction (Day 90 snapshot)

| Metric | Day-90 target | Status |
|---|---|---|
| Paying users | 100+ | TBD (curl /admin/metrics) |
| MRR | ₹25k | TBD |
| Cumulative GMV | ₹1L+ | TBD |
| NRI mix | 15%+ | TBD |
| D7 retention | ≥35% | TBD |
| D30 retention | ≥25% | TBD |
| Testimonials | 3 (1 NRI + 2 dom) | TBD |
| Press hit | 1 (YS/Inc42/Mint) | TBD |
| APK installs | 500+ | TBD |

Replace TBD with live numbers from `/admin/metrics/investor` on pitch day.

## Slide 5 — Product (screen tour)

- **Web** `darshya.online` — landing, /pujas, /temples, /darshan, /gift, /yatra, /astrology.
- **Mobile** Android APK — devotee tab + 7 provider portals (pandit, temple, gaushala, store, astrologer, wellness, admin).
- **Admin** `/admin/metrics` — real-numbers dashboard, founder uses 2x daily.
- 27-route programmatic SEO surface (/deity, /festival, /city, /tirth, /chants, etc.) — 500+ sitemap entries.

## Slide 6 — Business model

| Line | Domestic median | NRI median | Commission | Net/txn |
|---|---|---|---|---|
| Puja booking | ₹1,501 | $169 | 20-25% | ₹262 / ₹2,910 |
| Gift puja (NRI→IN) | — | $120 | 25% | ₹2,068 |
| Donation | ₹501 | $51 | 5-10% | ₹12 / ₹222 |
| Astrology consult (18min) | ₹180 | $18 | 25% | ₹40 / ₹284 |
| Wellness session | ₹599 | $51 | 20% | ₹105 / ₹672 |
| Store order | ₹499 | $51 | 30% (lifted) | ₹150 / ₹430 |
| Yatra package (MVP2) | ₹55k | $4,200 | 10% | ₹4,125 / ₹20,970 |

Take-rate weighted to NRI = 10.4× domestic gross per txn.

## Slide 7 — 12-month projection (Realistic)

- M1 ₹16k → M3 ₹25k → M6 ₹47k → M9 ₹95k → M12 **₹1.88L MRR**.
- Cumulative Year 1 GMV ≈ ₹8.6L.
- Founder ₹50k salary break-even at **M6**.
- 3-person team ₹150k break-even at **M11**.
- **Zero infra cost.** 100% free-tier (Render + CF Pages + Supabase + GH Actions + Resend + WA Cloud).

## Slide 8 — Why now

- UPI penetration > 350M users, NPCI 2025 cross-border rails live.
- Stripe India + Razorpay International unlocked NRI in 2024.
- Post-COVID temples receptive to streaming (we have 6 verified live).
- Sri Mandir at $20M ARR proves devotional market. None do video proof + NRI lane.

## Slide 9 — Moat

1. **Video proof = trust** — competitor pivot would take 12+ months (temple onboarding, IVS infra, SLA agent).
2. **80G + PAN compliance** — captured at gaushala onboarding, verified at receipt issuance.
3. **24-agent ops fleet** — 1 founder, 10-person output (cold outreach, broken-link, schema, keyword rank, retention nudges, investor digest — all autonomous on GH Actions cron).
4. **27 programmatic SEO routes** — daily-compounding organic acquisition.

## Slide 10 — Team + ask

- Founder solo. Stack: full-stack TS, Next 15, Fastify 5, Prisma, Supabase, React Native (Expo).
- Built 70+ commits, 416/416 API tests green, 0 paid infra.
- **Ask**: ₹2-3 Cr seed at ₹15-20 Cr valuation. 24-month runway. Hire 1 BD (NRI partnerships), 1 mobile engineer, 1 ops.
- Use of funds: U1 Razorpay live KYC docs, U2 Stripe NRI live, Apple Dev $99, paid acquisition test ₹5L, founder ₹50k × 24.

## Slide 11 — Risk register

| Risk | Mitigation |
|---|---|
| Sri Mandir launches USD tier | Tripwire fold to NRI-only SKU (in ROADMAP.md) |
| Temple churn (no verifications) | Verified-only listing rule + booking-quality-monitor agent |
| Payment KYC delay | Stripe domestic + Razorpay both live test mode; demo flow gated U15 |
| NRI mix < 15% by week 12 | Tripwire fold to NRI-only SKU |
| WA / Resend free tier breach | WA-primary for daily-devotional, soft-cap MAX_EMAIL_RECIPIENTS |

## Slide 12 — Roadmap (post-seed)

- **Q3 2026**: iOS App Store (U3 unlocked), live IVS production tier, B2B white-label.
- **Q4 2026**: 12-Jyotirlinga individual booking pages, Char Dham yatra commerce, Apple Pay/Google Pay NRI.
- **2027**: Sangha (community sittings), wedding photographer marketplace, Sanskrit gamified courses.

---

## Appendix slides (back pocket)

- **A1**: 24-agent fleet table — names, cron, output cadence, business outcome.
- **A2**: Booking flow video walk-through (loom or recorded).
- **A3**: Security baseline — every P0 from internal audit closed (Sprint 1 commit log).
- **A4**: API metrics — 416/416 tests, p95 latency hook, /admin/metrics screenshot.
- **A5**: Commercial schema — Puja → Booking → Transaction → Commission ledger (Prisma diagram).
