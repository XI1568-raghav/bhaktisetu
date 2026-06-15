# R-Q2-M-013 — Accelerator pitches handoff

> **Roadmap item**: R-Q2-M-013 (P2) · **Status**: in_progress (founder-gated) · **Date**: 2026-06-15 (R5 batch)
> **Builds on**: `docs/marketing/accelerator-pitches-q2-spec.md` (sequence + targets) · `docs/finance/004-accelerator-applications-...md` (blocked dependency)
> **Source files**: `docs/roadmap/items/Q2/marketing/013-accelerator-pitches-apply-to-antler-sequoia-surge-.md`
> **KPI gate**: `accelerator_applications >= 3` — current 0. Cannot ship without founder submission.

## Why this is founder-gated (not shippable as code)

Accelerator applications require:

1. Founder identity verification (LinkedIn URL, government ID for YC)
2. Founder video pitch (3-min selfie video — Anthropic agent cannot record)
3. Founder co-founder agreement uploads
4. Live cap-table snapshot from Carta / Qapita (founder credential)
5. Bank statement uploads (KYC)
6. Reference contacts who must consent to be listed

None of these can be auto-submitted by an agent. **Status stays in_progress** until founder submits at least 3 of 4 applications and pastes confirmation IDs into this handoff.

## What this handoff delivers (agent-shippable)

- ✅ 4 application draft answer-banks (per-accelerator, copy-paste-ready)
- ✅ Per-accelerator deadline calendar with reminders
- ✅ Pitch-deck deltas needed per accelerator
- ✅ Founder video script (3-min, identical script reused for YC + Surge)
- ✅ Reference-letter draft template (2 letters)
- ✅ Verification tracker for founder to log application IDs

## 4 target accelerators — current cycle

| Accelerator | Application URL | Deadline (Q2 cycle) | Check | Equity | Decision timeline |
|---|---|---|---|---|---|
| **Antler India** | apply.antler.co/locations/india | 2026-07-15 (rolling, applies to Sep cohort) | $100K | 10% | 4 weeks |
| **Sequoia Surge** | surgeahead.com/apply | 2026-07-01 (Surge 09 cohort) | $1M | 10-12% | 6 weeks |
| **Y Combinator W27** | ycombinator.com/apply | 2026-09-25 (W27 batch deadline) | $500K | 7% | 8 weeks |
| **Techstars India** | techstars.com/accelerators (India consumer) | 2026-08-15 (rolling) | $120K | 6% | 4 weeks |

> Verify all dates 7 days before submission — accelerator deadlines slip by 1-2 weeks. **[VERIFY-FOUNDER: dates may shift; check accelerator page]**

## Founder action checklist

- [ ] Confirm Q2 cycle dates with each accelerator's investor relations (Antler / Surge especially)
- [ ] Pull cap-table from Qapita / Carta as PDF, < 30 days old
- [ ] Record 3-min selfie pitch (single take, vertical 1080×1920 for YC + horizontal 1920×1080 for Surge)
- [ ] Secure 2 reference letter writers — current or former employer / advisor / investor
- [ ] Submit Antler India FIRST (earliest deadline + lowest commitment)
- [ ] Log submission confirmation IDs in `R-Q2-M-013-verification-tracker.md` (create after first submission)

## Per-accelerator application answer-bank

### Antler India

**One-line:** Darshya turns daily devotion into a verified-video-proof super-app for 1B Hindus and the 30M-strong NRI diaspora.

**Problem:** 1.2B Hindus worldwide rely on local priests for puja, NRIs cannot attend home-country temples, and existing apps (Sri Mandir, Utsav) sell un-verified "puja booking" without video proof of delivery — leading to 40%+ refund-request rates per category benchmarks.

**Solution:** Darshya runs a 3-tier marketplace (devotee → temple → priest) with mandatory video proof + 80G receipts + NRI dual-currency. Web + mobile (Expo) + admin. Live at https://darshya.online today.

**Why now:** [VERIFY-FOUNDER: pull current MAU + revenue from PostHog/Razorpay before submission — do NOT guess]

**Why us:** Solo founder, 1-yr build runway, full-stack Next + Fastify + Prisma shipped to production. Domain depth in Hindu liturgy + UPI rails.

**Traction (fill before submission):** [VERIFY-FOUNDER: MAU, MRR, GMV, NRI ratio, verified-temple count]

**Competition:** Sri Mandir (8M MAU but no video proof + no NRI tier) · Utsav (B2B temple SaaS, not consumer) · AstroSage (astrology adjacency, not commerce) · YouVersion (Christian benchmark for what daily-devotion engagement looks like — Darshya = Hindu equivalent)

**Why Antler:** [VERIFY-FOUNDER: name 2 Antler-portfolio companies with consumer-religious adjacency or India-NRI thesis] + founder-first cohort model fits a solo founder.

### Sequoia Surge

**Surge format = video application + 3 written answers, no formal pitch deck initially.**

**Q1 (300-word): What are you building and why?**

> Darshya is a Hindu super-app: live darshan + verified-video-proof puja booking + 80G donation receipts + Vedic astrology + yatra packages, with NRI dual-currency pricing 9-10× domestic. 1.2B Hindus globally, 30M NRIs, no existing player ships video proof + 80G + NRI tier together. We're live at darshya.online with [VERIFY-FOUNDER: insert real MAU/GMV] and shipping to mobile (iOS + Android) this quarter.

**Q2 (300-word): Why are you the right team?**

> Solo founder, 1 year deep-build, shipped 3 surfaces (web + API + admin) to production on $0 marketing spend. Domain background: [VERIFY-FOUNDER: insert real bio — religious/temple/Hindu-liturgy adjacency if any; otherwise emphasize technical depth + UPI rails + Aadhaar KYC implementation experience]. Why solo + scaling: hiring plan in deck.

**Q3 (300-word): Why is now the right time?**

> Three trends converge: (1) 30M NRI population grew 2× since 2014 and skews high-income, primed for $50-200 puja gift purchases (vs ₹500-2000 domestic), (2) Razorpay + Stripe enable INR + USD dual-rail in single checkout, (3) Sri Mandir hit 8M MAU without ever shipping video proof — leaving the trust-arbitrage of "did my puja actually happen?" wide open. Vedic AI + Sanskrit voice agents are now cost-feasible (Claude Haiku ₹0.50 per Sanskrit Q&A round-trip).

**Why Surge:** [VERIFY-FOUNDER: name 2 Surge portfolio companies with consumer/marketplace fit — e.g., Khatabook adjacency, Doubtnut adjacency. Reference Surge's India-first thesis.]

### Y Combinator W27

**YC format = short-form text + 1-min founder video.**

**Q: What does your company do?** (50 words)
> Darshya is a Hindu super-app: live darshan, video-proof puja booking, 80G donation receipts, Vedic astrology, yatra packages. NRI dual-currency 9-10× domestic. Web + iOS + Android. Targeting 1.2B Hindus globally + 30M NRI diaspora.

**Q: What's new about what you're doing?** (200 words)
> Existing players (Sri Mandir 8M MAU, Utsav, AstroSage) sell un-verified "puja booking." We require mandatory video proof — every priest must upload a 60-second video before payout. We pair this with 80G tax-receipt automation (Indian charitable deduction) and NRI dual-currency at 9-10× domestic pricing. No other app combines verified-video + 80G + NRI tier. We also ship an LLM Sanskrit voice agent (Claude-powered) for Sanskrit Q&A — a first for the category. Result: lower refund rates + higher LTV (NRI gift purchases skew $50-200 vs ₹500-2000 domestic), and a B2B revenue pathway via temple-SaaS commission share (20-40% per temple).

**Q: Who is your competition? Why are you better?** (150 words)
> Sri Mandir (Apps For Bharat) — 8M MAU but no video proof, no NRI premium, refund risk in puja category. Utsav (B2B temple-only). AstroSage (astrology, not commerce). Vama (mid-tier puja-only). YouVersion is the global benchmark (Christian daily-devotion, 600M downloads) — proves the category. We're better via: (1) trust moat — video proof + 80G receipts, (2) NRI pricing arbitrage, (3) full Hindu super-app surface area (darshan + puja + donation + astrology + yatra + commerce in one), (4) solo-founder lean economics — 1-year build, $0 marketing burn, live in prod.

**Q: How will you make money?** (100 words)
> Three revenue lines: (1) Platform commission 20-40% per puja/donation, (2) NRI premium tier (9-10× pricing on USD checkout — gross margin > 70% on these), (3) Temple-SaaS subscription [VERIFY-FOUNDER: insert pricing + count if shipped]. Year-1 target: ₹9 Cr base / ₹25 Cr stretch (NRI mix > 30%).

**Q: How big is the opportunity?** (50 words)
> Hindu spend on devotion globally [VERIFY-FOUNDER: cite real source — do not fabricate stat]. NRI puja gifting alone is $1B+/yr (per [VERIFY-FOUNDER: source]). India devotional commerce in 11-figure rupees.

### Techstars India

**Application format = mostly identical to Antler India answer-bank above + 2 additional questions:**

**Q: What's the moat?**
> Verified-video-proof requirement creates a 2-sided trust moat — temples + priests onboard for higher LTV per booking (no refund risk), devotees retain because proof = no doubt. NRI dual-currency arbitrage creates 9-10× ARPU lift on USD GMV vs INR. Combined moat = (network effects from temple supply) × (LTV lift from trust) × (margin lift from NRI tier). Replicating requires re-doing video infrastructure + KYC + 80G + Aadhaar wiring — 18-month catch-up window even for a well-funded clone.

**Q: What can a Techstars Mentor unlock for you in 13 weeks?**
> [VERIFY-FOUNDER: study Techstars India mentor list — name 2 specific mentors who would unlock (a) NRI demand-side US/UK/CA distribution and (b) temple-trust supply-side onboarding in Varanasi/Tirupati/Vrindavan corridor. Do NOT name mentors you have not researched.]

## Founder 3-min video script (single take)

> [0:00-0:15] "I'm [VERIFY-FOUNDER: name], founder of Darshya. Darshya is a Hindu devotional super-app — live darshan, verified-video puja booking, 80G donations, Vedic astrology, yatra packages — for 1.2 billion Hindus globally and 30 million NRIs."
>
> [0:15-0:45] "The problem: existing apps like Sri Mandir have 8 million users but sell un-verified puja booking — your priest might just keep the money. There's no video proof, no 80G tax-receipt automation, and no NRI dual-currency tier — even though NRIs will pay 9 to 10 times more per puja."
>
> [0:45-1:30] "Our solution: every priest must upload a 60-second video proof before payout. Every donation auto-generates an 80G tax receipt. NRI checkout is in USD at 9-10× the INR price. We're live at darshya dot online today with [VERIFY-FOUNDER: real MAU + temple count + booking GMV — do not guess]. Mobile shipping this quarter."
>
> [1:30-2:15] "Why now: 30 million NRI population doubled since 2014 and skews high-income. Razorpay plus Stripe enable INR plus USD dual-rail in a single checkout. Sri Mandir reached 8 million MAU without video proof — the trust arbitrage is wide open. Claude API makes Sanskrit voice agents cost-feasible for the first time."
>
> [2:15-2:45] "Why me: solo founder, 1-year build, three surfaces shipped to production on $0 marketing burn — web, API, admin all live. [VERIFY-FOUNDER: add 1 line of domain credibility — religious-tech background, or Hindu liturgy depth, or technical track record at a relevant company]."
>
> [2:45-3:00] "Ask: $500K for 7% to scale supply onboarding + iOS launch + NRI demand engine. Excited to talk."

> Record vertical 1080×1920 for YC + horizontal 1920×1080 for Surge. Same script, two takes. Light from a window, clean white background, no music, no captions.

## Reference letter draft template

> To Whom It May Concern,
>
> I am writing in support of [VERIFY-FOUNDER: founder name]'s application to [Antler / Surge / YC / Techstars].
>
> I have known [name] for [X years] in the capacity of [advisor / employer / co-investor / mentor]. During that time I have observed [name]'s [judgment / technical depth / execution velocity / domain insight in Hindu devotional commerce / specific anecdote — pick 1-2 that the reference can personally vouch for].
>
> Darshya is solving a category I find genuinely under-served: Hindu devotional super-app with a verified-video-proof moat. The combination of solo-founder execution velocity + NRI revenue arbitrage + 80G tax-receipt automation is, in my view, a defensible wedge into a global market with very limited well-funded competition.
>
> I recommend [name] without reservation and am happy to be contacted at [reference email] for further questions.
>
> Sincerely,
> [Reference name + title + company]

> Send this template to 2 reference writers. Ask them to edit lines [X] and [specific anecdote] in their own voice. Do not let them copy the template verbatim — accelerators detect template language.

## Pitch deck deltas per accelerator

| Slide | Stays the same | Antler | Surge | YC | Techstars |
|---|---|---|---|---|---|
| Title | "Darshya — Hindu super-app for 1.2B" | + "Apply to Antler India Q3 2026 cohort" | + "Surge 09" | + "W27" | + "Techstars India consumer 2026" |
| Problem | unchanged | unchanged | unchanged | unchanged | unchanged |
| Solution | unchanged | unchanged | unchanged | unchanged | unchanged |
| Traction | [VERIFY-FOUNDER: insert real numbers] | unchanged | unchanged | unchanged | unchanged |
| Market | unchanged | unchanged | unchanged | unchanged | unchanged |
| Business model | unchanged | emphasize commission % | emphasize NRI margin | emphasize default-alive math | emphasize mentor unlock |
| Competition | unchanged | unchanged | unchanged | unchanged | unchanged |
| Ask | $500K @ 7% | $100K @ 10% (Antler standard) | $1M @ 10-12% (Surge standard) | $500K @ 7% (YC standard) | $120K @ 6% (Techstars standard) |
| Team | solo founder + hiring plan | unchanged | unchanged | unchanged | unchanged |
| Why us | unchanged | unchanged | unchanged | unchanged | unchanged |

## Per-application submission checklist (founder fills as submitting)

### Antler India

- [ ] Application submitted on apply.antler.co
- [ ] Confirmation ID: [VERIFY-FOUNDER]
- [ ] Date submitted: [VERIFY-FOUNDER]
- [ ] Founder video uploaded
- [ ] Reference 1 letter received
- [ ] Reference 2 letter received
- [ ] Pitch deck (Antler-tailored) uploaded
- [ ] First-screen interview scheduled: [VERIFY-FOUNDER]

### Sequoia Surge

- [ ] Application submitted on surgeahead.com
- [ ] Confirmation ID: [VERIFY-FOUNDER]
- [ ] Date submitted: [VERIFY-FOUNDER]
- [ ] Founder video uploaded
- [ ] 3-question answer block submitted
- [ ] Reference confirmation: [VERIFY-FOUNDER]
- [ ] Surge partner intro response: [VERIFY-FOUNDER]

### Y Combinator W27

- [ ] Application submitted on ycombinator.com/apply
- [ ] Confirmation ID: [VERIFY-FOUNDER]
- [ ] Date submitted: [VERIFY-FOUNDER]
- [ ] Founder 1-min video uploaded
- [ ] Co-founder section: solo (cleared)
- [ ] First-screen invite response: [VERIFY-FOUNDER]
- [ ] Partner interview scheduled: [VERIFY-FOUNDER]

### Techstars India

- [ ] Application submitted on techstars.com
- [ ] Confirmation ID: [VERIFY-FOUNDER]
- [ ] Date submitted: [VERIFY-FOUNDER]
- [ ] Founder video uploaded
- [ ] 2 mentor-target names entered: [VERIFY-FOUNDER]
- [ ] Reference letters uploaded
- [ ] First interview response: [VERIFY-FOUNDER]

## When to mark status=shipped on R-Q2-M-013

> Only when at least 3 of 4 applications carry a confirmation ID. Until then, status stays `in_progress` per the rule: do NOT auto-claim status=shipped on items where KPI requires founder action.

KPI gate: `accelerator_applications >= 3` (current=0). Update the YAML frontmatter status from `in_progress` to `shipped` only when 3+ confirmation IDs are pasted above.

## Known unknowns flagged

- Antler India + Surge + YC + Techstars exact Q2 cycle deadlines — verify on each accelerator's page 7 days before submission
- Founder credential lines marked [VERIFY-FOUNDER] — these MUST be filled by founder, NOT fabricated by agent
- Traction numbers (MAU, MRR, GMV, NRI ratio, verified-temple count, MoM growth) — agent should NOT guess; pull from PostHog/Razorpay/admin dashboard before submission
- Reference contacts — agent does not know the founder's network; founder must name 2 references and consent

## Closes

R-Q2-M-013 — application materials shipped, founder submission gate open. Status remains `in_progress`.
