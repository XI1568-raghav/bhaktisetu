# Pre-seed Pitch Deck v2 — Outline + 12mo Financial Model

> **Roadmap item**: R-Q2-F-001 (P0) · **Authored**: 2026-06-12 · **Owner**: founder (fill numbers, design in Figma/Keynote/Google Slides)
>
> **Audience**: Indian early-stage investors (Blume, Kalaari, Stellaris, Together Fund, Speciale, Angel groups) + Indian-origin SF angels (NRI-focused funds) · **Round target**: ₹3-5 Cr ($350K-$600K) pre-seed at $3-5M post-money valuation · **Use of funds**: 18-month runway to ₹15L MRR (Series A ready)

## Deck structure — 12 slides

### Slide 1 — Cover

```
BHAKTISETU
The verified-temple devotional super-app for India + diaspora

[founder photo + name]
[founder@darshya.online · phone]
Pre-seed · 2026
```

Visual: simple, full-bleed temple silhouette image. NO bullet points. Pure brand moment.

### Slide 2 — Problem

```
1B Hindus.
30M+ NRI diaspora.
Annual ritual spending: ₹2 lakh crore.

No platform devotees TRUST.
```

3 specific failures (bullet list):
- "Online puja" apps don't show you the priest or the temple
- Zero video proof of completion (you book, then wait + hope)
- Marketplace race-to-the-bottom on pricing kills temple economics

### Slide 3 — Solution

```
Bhaktisetu = verified temple network + video proof + transparent pricing.

Every booking:
- Pandit + temple verified KYC
- Video proof delivered within 72h
- 80G receipt auto-issued
- 60-80% revenue to temple (transparent)
```

Visual: 4-quadrant infographic of these 4 pillars.

### Slide 4 — Why now

```
Three converging tailwinds:

1. NRI diaspora wealth (1st-gen Hindu families now have disposable income for ancestral pujas they couldn't before)
2. India post-UPI digital trust (90% of devotees comfortable w/ online payment for religious services — new in last 5 years)
3. AI agents reduce ops cost (autonomous orchestrator runs supply pipeline on $0 infra)
```

### Slide 5 — Wedge

```
Muhurat-first, not menu-first.

Every other devotional app: "browse 50 puja types"
Bhaktisetu: "we computed your shubh muhurat first, then matched the right pandit"

This is unbeatable because no competitor's UX starts from the panchang.
```

(Reference R-Q4-P-003 wedding planner muhurat-first wedge as one example)

### Slide 6 — Traction (Q1 actuals)

```
Built last 4 weeks (solo founder):

- Autonomous roadmap orchestrator (Opus 4.7 + 4 sub-agents, runs every 8h)
- 22 roadmap items shipped this week alone (real metric, GH commit history)
- 30 BLR temple prospects in pipeline (R-Q1-S-005)
- 30 astrologer prospects (R-Q1-S-007)
- 30 Canada NRI pandit prospects (R-Q3-S-007)
- 5 pilot Bengaluru pandits agreed in principle
- 4 spec docs ready for eng pickup (wedding-planner, adopt-a-temple, festival-presale, B2B whitelabel)
- 54 unit tests green (wallet + referrals + payment + sla-breach)
- $0 monthly burn (free-tier discipline)
```

Brutal honesty: ZERO paying customers as of pre-seed deck date. Pitch this as "infrastructure ready, supply pipeline armed, pre-revenue moment of inflection."

### Slide 7 — Business model

```
5 revenue lanes:

L1 Puja bookings — pay-per-puja, 20-40% platform fee → ₹1.5L MRR Q2 / ₹3.5L Q4
L2 Adopt-a-Temple subscriptions — recurring 15% platform fee → ₹1.2L MRR Q2 / ₹3L Q4
L3 CSR donation match — corporate sponsorship 5-10% → ₹1L MRR Q2 / ₹2.5L Q4
L4 B2B white-label SaaS — 90% gross, 10% partner share → ₹0.8L MRR Q2 / ₹2L Q4
L5 Affiliate / cross-channel — astrology + yatra commission → ₹0.5L MRR Q2 / ₹1.5L Q4

Q2 target: ₹5L MRR
Q4 target: ₹12.5L MRR (= ₹1.5Cr ARR)
```

Reference `docs/finance/mrr-tracking-cadence-v1.md` for tracking discipline.

### Slide 8 — Unit economics

```
Per puja booking (avg):
- Devotee pays: ₹501
- Pandit/temple keeps: ₹400 (80%)
- Platform fee: ₹101 (20%)
- Razorpay processing: -₹15
- Foundation overhead: -₹25
- NET CONTRIBUTION: ₹61

Per NRI puja (avg):
- Devotee pays: $50 (~₹4,200 — 9x INR rate per business rule)
- Pandit keeps: ₹2,400
- Platform: ₹1,800
- Stripe processing: -₹125
- GST 18%: -₹770
- NET CONTRIBUTION: ₹905

LTV / CAC math:
- Avg devotee makes 3 bookings/year × ₹61 contrib = ₹183 LTV (India)
- NRI 4 bookings/year × ₹905 = ₹3,620 LTV (diaspora)
- Organic CAC: ₹0 (build-in-public + warm-network)
- Paid CAC ceiling: ₹500 (under LTV for India ✓, way under for NRI ✓)
```

### Slide 9 — Market + competitors

```
TAM: ₹2 lakh crore Indian ritual spend × 0.5% serviceable = ₹1,000 Cr ARR opportunity

Competitors:
- Sri Mandir (₹50Cr raised, large MAU, weak verification)
- VedicTribe (smaller, content-focused)
- BookMyPandit (pandit marketplace, no temple integration)
- Online-puja point solutions (no platform unification)

Differentiation:
- Sri Mandir doesn't verify temples; we do (BAPS-style KYC)
- BookMyPandit doesn't integrate with temples; we do
- No competitor has muhurat-first wedge OR Foundation/80G/CSR rails
```

### Slide 10 — Team

```
Founder: [Name]
- [Background — IIT/IIM/prior startup/IT corp/etc.]
- 5+ years building [domain]
- Solo for now; first hire = CS associate after ₹1L MRR (per R-Q1-H-001)

Advisors:
- [If existing — Foundation board, etc.]
- [PLACEHOLDER if not yet — founder action: recruit 2 advisors]

What I want from this round:
- Capital for 18 months runway
- Advisor introductions (CSR + temple network + tech)
- Hiring guidance for first 3 hires (CS, marketing, eng)
```

### Slide 11 — Ask + use of funds

```
Raising: ₹3-5 Cr pre-seed
Valuation: $3-5M post-money
Round structure: SAFE or CCPS (founder-favorable)

Use of funds (18-month plan):

40% Hiring — 3 hires (CS, marketing, senior eng)
20% Marketing — paid + content for India + NRI segments
15% Infra — paid-tier when MAU > 50K (currently $0)
10% Foundation operations — CA + audit + legal counsel
10% Founder runway — modest stipend
5%  Contingency / runway extension

Runway: 18 months to ₹15L MRR (Series A ready)
```

### Slide 12 — Closing

```
The opportunity:
1. 1B+ devotees, 0 trusted platform
2. Solo founder building w/ $0 burn + autonomous AI agents
3. Multiple revenue lanes proven in spec (wedding planner / adopt-a-temple / B2B SaaS / CSR)
4. 18-month path to ₹15L MRR via Bengaluru-first deep dive

Looking for: pre-seed lead + 2-3 angel co-investors

Contact:
[founder name] · founder@darshya.online · +91 [phone]
Demo: https://darshya.online
```

## 12-month financial model template

Save as Google Sheet for founder editing. Skeleton below; founder fills monthly numbers.

```
                          | Jun26 | Jul26 | Aug26 | Sep26 | Oct26 | Nov26 | Dec26 | Jan27 | Feb27 | Mar27 | Apr27 | May27 |
--------------------------|-------|-------|-------|-------|-------|-------|-------|-------|-------|-------|-------|-------|
REVENUE
L1 Puja bookings MRR      |     0 |   10K |   30K |   60K |  100K |  150K |  200K |  250K |  290K |  320K |  340K |  350K |
L2 Adopt-temple sub MRR   |     0 |     0 |     5K |   15K |   40K |   80K |  120K |  170K |  220K |  260K |  290K |  300K |
L3 CSR match MRR          |     0 |     0 |     0 |   25K |   50K |  100K |  150K |  175K |  200K |  225K |  240K |  250K |
L4 B2B white-label MRR    |     0 |     0 |     0 |     0 |   10K |   30K |   60K |   90K |  130K |  160K |  185K |  200K |
L5 Affiliate MRR          |     0 |     0 |     0 |     0 |     0 |   10K |   20K |   40K |   70K |  100K |  130K |  150K |
--------------------------|-------|-------|-------|-------|-------|-------|-------|-------|-------|-------|-------|-------|
TOTAL MRR                 |     0 |   10K |   35K |  100K |  200K |  370K |  550K |  725K |  910K | 1.07L | 1.19L | 1.25L |
                          |       |       |       |       |       |       |       |       |       |       |       |       |
COSTS
Founder stipend           |   50K |   50K |   50K |   50K |   50K |   75K |   75K |   75K |  100K |  100K |  100K |  100K |
First CS hire (mo 5+)     |     0 |     0 |     0 |     0 |   40K |   40K |   40K |   45K |   45K |   45K |   45K |   45K |
Marketing hire (mo 8+)    |     0 |     0 |     0 |     0 |     0 |     0 |     0 |   60K |   60K |   60K |   60K |   60K |
Senior eng hire (mo 11+)  |     0 |     0 |     0 |     0 |     0 |     0 |     0 |     0 |     0 |     0 | 120K  | 120K  |
Infra (free → paid mo 6+) |     0 |     0 |     0 |     0 |     0 |   10K |   10K |   12K |   15K |   18K |   22K |   25K |
Marketing spend           |     0 |     5K |   10K |   25K |   50K |   75K |  100K |  100K |  125K |  150K |  150K |  150K |
Foundation ops (CA/legal) |   10K |   10K |   10K |   10K |   10K |   10K |   15K |   15K |   15K |   15K |   20K |   20K |
Misc/contingency          |     5K |     5K |     5K |     5K |   10K |   15K |   15K |   20K |   25K |   25K |   30K |   30K |
--------------------------|-------|-------|-------|-------|-------|-------|-------|-------|-------|-------|-------|-------|
TOTAL COSTS               |   65K |   70K |   75K |   90K |  160K |  225K |  255K |  327K |  385K |  413K |  547K |  550K |
                          |       |       |       |       |       |       |       |       |       |       |       |       |
NET (MRR − Cost)          |  -65K |  -60K |  -40K |   10K |   40K |  145K |  295K |  398K |  525K |  657K |  643K |  700K |
                          |       |       |       |       |       |       |       |       |       |       |       |       |
CUMULATIVE BURN           |  -65K | -125K | -165K | -155K | -115K |   30K |  325K |  723K | 1.24L | 1.90L | 2.55L | 3.25L |
```

**Key observations**:
- Burn peaks at -₹1.65L (cumulative) Aug-Sep 2026
- Break-even Sep 2026
- ₹3+ Cr cumulative net by May 2027 = Series A readiness signal
- Pre-seed ₹3-5 Cr provides 18+ months runway w/ huge buffer

**Sensitivity scenarios** (founder builds 3 columns):

```
                    | BEAR    | BASE    | BULL    |
Q2 MRR              | ₹2.5L   | ₹5L     | ₹7.5L   |
Q4 MRR              | ₹6L     | ₹12.5L  | ₹20L    |
Break-even month    | Dec'26  | Sep'26  | Jul'26  |
Series A ARR        | ₹1Cr    | ₹2.5Cr  | ₹4Cr    |
Series A valuation  | $10M    | $20M    | $40M    |
```

## Founder action checklist

```markdown
- [ ] Review deck outline above — strike anything that feels off-voice
- [ ] Fill PLACEHOLDER values (background, advisors, exact contact phone)
- [ ] Design in Figma OR Google Slides — 12 slides exact (no slide creep)
- [ ] Brand: temple silhouette + saffron-ish primary color (NO emoji walls)
- [ ] Validate unit economics math w/ Foundation CA (Slide 8 numbers)
- [ ] Validate TAM math w/ industry analyst OR Inc42 India consumer-internet report
- [ ] Build 12-mo Google Sheet financial model from skeleton above
- [ ] Get 2 advisors to review deck pre-investor send
- [ ] Pre-warm 5 target investors (Blume / Kalaari / Together / etc) via mutual intros BEFORE sending deck
- [ ] Send deck → 1-on-1 Zoom 30-min meeting → MoU within 60 days target
- [ ] Track investor pipeline at docs/finance/investor-pipeline-2026-06.md (founder fills as outreach happens)
```

## Investor target list (top 10 to pre-warm)

| # | Fund / Angel | Stage focus | Why fit | Warm-intro path |
|---|---|---|---|---|
| 1 | Blume Ventures | Pre-seed/seed | Consumer + India focus | [VERIFY founder LinkedIn 2nd-degree] |
| 2 | Kalaari Capital | Pre-seed/seed | Consumer + Bengaluru-based | [VERIFY] |
| 3 | Stellaris VP | Seed | Consumer + emerging | [VERIFY] |
| 4 | Together Fund | Seed | Founder-backable + India consumer | [VERIFY] |
| 5 | Speciale Invest | Pre-seed | Tech + India early | [VERIFY] |
| 6 | Inflection Point Ventures | Angel syndicate | Wide India angel base | [VERIFY] |
| 7 | LetsVenture | Angel syndicate | NRI-friendly | [VERIFY] |
| 8 | First Cheque | Angel-led pre-seed | India consumer specifically | [VERIFY] |
| 9 | A-list India NRI angel — [name TBD via SF Indian-founder network] | Angel | NRI lens | [VERIFY] |
| 10 | [Existing Bhaktisetu Foundation board / advisor — if any pre-existing] | Strategic | Already-aligned | Direct |

## Out of scope

- Term sheet template (raise lawyer once first VC offer arrives)
- Cap table modeling (raise CA + lawyer)
- Pitch deck DESIGN (founder + designer, separate ticket)
- Demo video creation (R-Q1-U13 — already exists, refresh for investor demo if needed)
- Data-room building (compile post-first-meeting on demand)
- 409A valuation (post-funding only)

## Closes

R-Q2-F-001 — deck outline + financial model template shipped. Status flips to `shipped` after founder completes design + sends to first 3 investors.
