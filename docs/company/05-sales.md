# Darshya — Sales & BD Playbook

> Author: Head of Sales / BD
> Date: 2026-04-27
> Budget context: $0. Founder is solo. Every tactic must be free or near-free.

> **Research note**: WebSearch and most external WebFetch endpoints were unreachable during the drafting session (API 400 / 403 / 404). Numbers below labeled "ASSUMPTION (training data, ~2024)" need a 5-minute verification pass against Inc42, Entrackr, YourStory, Crunchbase before any of this leaves the founder's machine.

---

## 1. Supply-side acquisition — first 20 priests, free

The marketplace cold-start asymmetry is real: priests will not sign up for an empty platform, and devotees will not stay on a platform with no priests. Solve supply first. The bar for the first 20 priests is **not** "best priest in India" — it is "willing to pilot, has a smartphone, has WhatsApp, completes one bookable puja with video proof."

### Tactic A — ISKCON / temple-volunteer infiltration (highest leverage)

ISKCON, Chinmaya Mission, Art of Living, and most large maths run **WhatsApp seva groups** for local volunteers. Many young priests-in-training (brahmacharis, archaka students) sit in these groups looking for ways to monetize part-time without leaving the parampara. They are the ideal first cohort: tech-fluent, English-comfortable, already trust-building inside a known sampradaya.

- Find 3 such groups via the founder's existing temple contacts in Bengaluru (per About page, team includes archaka families — use that)
- Do **not** spam the group. Instead, post **one** message offering free listing + a Rs. 500 sign-on bonus paid out of the founder's pocket on first completed puja with video proof.
- Convert via 1:1 DM, not group thread.

### Tactic B — Cold WhatsApp to priests already running Instagram pages

Search Instagram for `#pandit`, `#purohit`, `#archaka`, `#vedicpriest` — there are easily 200+ priests in Karnataka/TN/Maharashtra running personal pages with bookings done via DM. They already accept the "online lead -> offline ritual" model. Pitch them on Darshya as a free CRM + payments rail (Razorpay handles compliance, they don't), not as a marketplace.

This is the highest-converting cohort because they have **proven willingness-to-list** elsewhere already.

### Tactic C — Temple trust BD (slowest but most defensible)

Temple trusts (especially mid-tier ones — not Tirupati, but the 200-500 footfall/day temples) have **zero digital strategy** and a board that meets monthly. Walk in physically with a printed one-pager. Do not ask for an MOU on day one; ask for a single live-darshan stream test on a festival day. After it works, the trust talks to 5 other trusts.

The founder has a Bengaluru-Chennai cluster advantage (per About page — Karnataka/TN). Pick 5 temples within a 2-hour drive.

### Outreach DM templates

**WhatsApp / Hindi-English mix — to a priest:**

> Namaste Panditji, main Darshya se baat kar raha hoon — devotees ke liye ek puja booking app banaya hai (darshya.online). Aapke liye listing 100% free hai, koi monthly fee nahi. Sirf jab booking complete ho aur aap video proof upload karein, tab payout hota hai (commission Free plan pe ~20%). Razorpay se direct bank account mein paisa aata hai. Kya 5 minute ke liye demo bhej sakta hoon?

**English — to a temple trust BD lead:**

> Respected Sir/Madam, I run Darshya, a devotional platform serving NRI and domestic devotees. We onboard temples for live darshan and puja sankalpa with zero setup cost — the temple keeps 60-80% of every booking, we handle payments, video proof, and 80G receipt generation. We've built compatibility with [name 1-2 already-onboarded temples — ASSUMPTION: list will be empty initially; substitute "we are piloting with two temples in [district]"]. May I send a 90-second video demo and a sample MoU?

**Instagram DM — to a priest already running a page:**

> Hi {name} ji — saw your Ganapati homam reel from {month}. We run Darshya — basically a free Razorpay-integrated booking page + 80G + UPI payouts for priests like you. Lower than Sri Mandir's 30%. Want me to set up your listing for free? No commitment, takes 10 minutes.

---

## 2. Demand-side — what supply must be true before the CMO can convert

Leaving demand acquisition to the CMO. Sales-side preconditions that **must** ship before any paid demand campaign:

1. **At least 8 priests live with calendar availability** — empty grids kill conversion.
2. **One marquee temple with daily live darshan working at 5am-9am IST and 6pm-9pm IST** — these are the two prime windows; if streaming fails during them, refund-rate spikes and the whole funnel inverts.
3. **Video-proof flow tested end-to-end** — this is the differentiator vs Sri Mandir; it must not be the first place users see a bug.
4. **NRI Stripe path tested with one US-card transaction** — NRI segment has 9-10× domestic ARPU per CLAUDE.md business rules; CMO will spend disproportionate budget there.

If any of these four is red, defer all demand-side spend.

---

## 3. Buyer / strategic-partner one-pager

> Designed to paste into an email body. ~250 words. Copy from `---BEGIN---` to `---END---`.

---BEGIN---

**Darshya — India's vertically-integrated devotional super-app**

**The problem.** 1.2B+ Hindus globally; an estimated 32M-strong Indian diaspora [ASSUMPTION: MEA 2024 figure ~32M, verify]; the Indian religious & spiritual services market is large and structurally underdigitized [ASSUMPTION: ~USD 40-58B addressable spend per industry estimates, needs verification against KPMG/Deloitte 2023-24 reports]. Existing players are point solutions — puja-only, content-only, or astrology-only.

**What Darshya is.** A single platform spanning live darshan (AWS IVS), puja booking with **mandatory priest-uploaded video proof** (no competitor enforces this), Jitsi-based 1:1 astrology and wellness consultations, gaushala seva, e-commerce (MedusaJS), and AI spiritual guidance (Groq Llama 3.3). Multi-role marketplace with priests, astrologers, wellness providers, temples, and gaushalas all monetized via configurable commission + subscription tiers.

**Tech moat.**
- Video-proof attestation — solves the #1 NRI trust gap (was the puja actually performed?)
- Real Jitsi consultation rail — most "astrology apps" still use phone calls
- Multi-role permissioning + commission engine — non-trivial to replicate in <6 months
- Built fully on free-tier infra (Cloudflare, Render, Supabase, Groq) — gross margin profile is rare

**Traction.** [ASSUMPTION — placeholder, no real numbers yet. Do not send this draft until real metrics exist. Even one number — "X priests live, Y bookings completed, Z% video-proof completion rate" — beats the placeholder.]

**Ask.** Strategic partnership / acquisition discussion. Founder is open to (a) distribution partnership (you push our supply into your existing audience), (b) acqui-hire, (c) majority acquisition. Reply for a 20-min call.

---END---

---

## 4. Comparable transactions (Indian devotional / spiritual tech)

> All three flagged ASSUMPTION (training data, mid-2024). Verify before citing in any pitch.

| # | Company | Stage / Round | Lead investor | Reported size | Notes |
|---|---|---|---|---|---|
| 1 | **AppsForBharat (Sri Mandir)** | Series B, ~Jan 2024 | Susquehanna Asia VC + Elevation Capital | ~USD 18M [ASSUMPTION] | Closest comp — puja booking + content; stronger content moat, weaker live-darshan stack. Total raised ~USD 25M+ across rounds [ASSUMPTION]. |
| 2 | **VAMA** (astrology + spiritual) | Series A, ~2022-23 | Elevation Capital [ASSUMPTION] | ~USD 7-9M [ASSUMPTION] | Astrology-led; consult-call rail; no live darshan or video-proof puja. |
| 3 | **AstroTalk** (adjacent — astrology marketplace) | Bootstrapped → reported profitability ~2023; round talks 2024 [ASSUMPTION] | Bootstrapped majority [ASSUMPTION] | Reported revenues ~Rs. 280Cr+ FY23 [ASSUMPTION] | Adjacent comp showing the 1:1 consult-call model is monetizable at scale; useful framing for Darshya's Jitsi rail. |

**Strategic-buyer universe** (not exhaustive):
- **Reliance Jio** — devotional content already on JioSaavn; no puja rail
- **Times Internet (Astro Yogi etc.)** — owns astrology assets, weak puja
- **InMobi / Glance** — distribution + lock-screen; would value supply-side
- **Bharat Matrimony group** — same demographic, religious-first
- **Tata Neu / Tata Digital** — has the audience, lacks the vertical content
- **ISKCON / large maths** — strategic, not acquirers, but distribution partners

---

## 5. Cold-email templates (3)

### (a) Temple trust BD lead

> Subject: 80G-compliant devotee booking pipeline for {Temple name} — no setup cost
>
> Respected Sir/Madam,
>
> Darshya runs a devotee-facing platform with live darshan, online puja sankalpa, and automated 80G receipt generation. We work commission-only — the trust keeps 60-80% of every booking and incurs zero setup or hosting cost.
>
> For {Temple name}, the immediate fit is festival-day live darshan and online sankalpa for NRI devotees (we already process Stripe for US/UK cards). I'd like to propose a single-festival pilot — no MoU required.
>
> Could I send a 90-second walkthrough and call you on {date+3 days} between 11am-1pm?
>
> Pranam,
> {Founder name} | darshya.online | {phone}

### (b) Sri Mandir / AppsForBharat partnerships [verify name]

> Subject: Live-darshan + video-proof puja supply for Sri Mandir users
>
> Hi {first name — current Head of Partnerships at AppsForBharat per LinkedIn, ASSUMPTION: verify before sending; do NOT use a placeholder name},
>
> Sri Mandir's content and panchang flow is unmatched, but I notice the puja-booking SKUs are still single-priest, no video proof. We've built exactly that rail at Darshya — AWS IVS streaming + mandatory priest-uploaded video attestation — and we'd be happy to be a supply API for your bookings funnel rather than competing for end-user attention.
>
> 15 minutes next week to explore a wholesale supply deal? Happy to share our API doc and current temple coverage upfront.
>
> {Founder name}, Darshya

### (c) Journalist (YourStory / The Ken / Inc42 / Entrackr)

> Subject: Video-proof pujas — solving the NRI trust gap nobody talks about
>
> Hi {first name},
>
> Your {recent piece on Sri Mandir / spiritual tech} resonated. One angle the category has not covered: NRI devotees increasingly distrust puja bookings because they cannot verify the ritual was actually performed. Refund disputes are quietly the largest customer-support cost line in this category [ASSUMPTION — verify with 2 operators before citing].
>
> We built Darshya around mandatory priest-uploaded video proof before any payout is released. I can share data on completion rates, dispute reduction, and the priest-side adoption curve.
>
> Worth a 15-minute call this week or next?

---

## 6. Deals to refuse

A $0-budget solo founder can be killed faster by a bad yes than by a slow no.

1. **Exclusive temple-trust MoUs that demand integration work upfront.** Some trusts will offer "exclusive online partner" status in exchange for custom branded apps, hardware installs, or dedicated support staff. Refuse anything that requires more than 8 hours of one-time integration before first revenue. Counter-offer: non-exclusive 6-month pilot, no custom build.

2. **Equity-for-distribution partnerships with influencer-priests / WhatsApp-channel owners.** They will ask for 1-5% equity to "promote to their 50k followers." This is almost always a bad trade — followers are inert, equity is not. Counter-offer: rev-share at 10-15% of attributable bookings for 12 months, capped, no equity.

3. **"White-label our app for our temple network" requests from religious organizations.** Looks like enterprise revenue; is actually unscoped consultware that consumes 3-6 months of solo-founder time and produces zero scalable IP. Refuse unless they pay a non-refundable Rs. 5L+ setup fee upfront. If they balk, the deal was never real.

---

## Assumptions ledger (for fast verification next session)

- Sri Mandir / AppsForBharat funding figures, Series B size, lead investors
- VAMA funding details
- AstroTalk revenue / round status
- Indian religious-services TAM figure
- Diaspora population figure
- Current Head of Partnerships name at AppsForBharat
- Refund-dispute being the largest CS cost line in the category
- All "traction" placeholders in the one-pager

Every item above must be verified or removed before any of this leaves the founder's machine.
