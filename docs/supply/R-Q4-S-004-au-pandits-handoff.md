# Onboard 10 Australia-based Verified Pandits (Sydney + Melbourne + Brisbane)

> **Roadmap item**: R-Q4-S-004 (P0) · **Quarter**: Q4 · **Month target**: 11 · **Authored**: 2026-06-15

## Status: founder-action-required

KPI (`verified_pandits_count_au = 10`) requires founder action — physical recruitment, KYC-equivalent verification (Australia-side identity + working-rights check), and activation of 10 humans across three Australian metros. Agent ships the scaffold, onboarding pipeline, AU-specific compliance checklist, scripts, and tracking doc. Status remains `in_progress` until founder closes via Supabase row count. Do not auto-flip to `shipped`.

## Why Australia (Q4 NRI lever)

| Lever | Detail |
|---|---|
| Diaspora size | ~780,000 Indian-origin Australians (2021 census trend +400% since 2006); largest non-European migrant cohort |
| Metro density | Sydney (~330k), Melbourne (~280k), Brisbane (~85k) — covers ~90% of devotional demand |
| Domestic supply gap | Existing AU pandit network thin + fragmented — WhatsApp-coordinated, no platform layer |
| Time-zone fit | AEST is UTC+10 → afternoon pujas in IST = morning AU; works for live Jitsi consultations + remote sankalp |
| Currency | AUD strong vs INR (~1 AUD = 55 INR Q4 2026) — premium pricing absorbs marketing CAC |
| Regulatory | Religious workers in AU operate under ABN (sole-trader) — no work-visa blocker if pandit is PR / citizen |

## Target mix (10 pandits across 3 metros)

| City | Count | Specialization mix |
|---|---|---|
| Sydney | 4 | 2× generalist (havan + Satyanarayan), 1× wedding, 1× Antim Sanskar / Shraadh |
| Melbourne | 4 | 2× generalist, 1× Griha Pravesh + Vastu, 1× Navagraha + Devi |
| Brisbane | 2 | 1× generalist, 1× wedding + Satyanarayan |

Tamil + Telugu + Marathi + Gujarati sampradaya coverage is a soft target (Sydney + Melbourne have strong South-Indian and Gujarati congregations through BAPS, Sri Venkateswara Temple Helensburgh, Shiva Vishnu Temple Carrum Downs).

## Verification checklist (per pandit — AU-specific, Aadhaar does NOT apply)

> Bhaktisetu's existing `aadhaarVerified` business-rule gate (rule #4) was authored for India. AU pandits need an **equivalent identity verification path**. Engineering ticket flagged below.

- [ ] AU government-issued photo ID (driver's licence OR passport)
- [ ] AU residency proof (Medicare card OR utility bill OR PR/citizenship document)
- [ ] ABN registration (Australian Business Number — required for sole-trader payouts >AUD $75k/year GST threshold; recommended for all)
- [ ] AU bank account (BSB + account number) for AUD payouts via Stripe AU rail
- [ ] Working with Children Check (WWCC) — required for any pandit conducting Mundan / Annaprashan / temple events involving minors
- [ ] Sampradaya credentials (Sanskrit Pathshala certificate OR guru-shishya parampara — 2 references from India OR AU temple authority)
- [ ] Min 5 years practicing experience (India OR AU)
- [ ] In-person interview (founder visit OR AU-based coordinator OR live video call w/ document originals shown)
- [ ] 3 reference clients in AU OR temple authority endorsement (e.g. Sri Venkateswara Helensburgh, Shiva Vishnu Carrum Downs, BAPS chapter)
- [ ] WhatsApp number (AU +61 OR India +91 if recently migrated) + email
- [ ] 3-5 puja category specializations selected
- [ ] Profile photo (1080×1080) + 60-90 sec intro video (English + native language)
- [ ] Daylight Savings + AU public holiday awareness test (basic Q&A — affects scheduling)
- [ ] Willingness to travel within metro for in-home pujas (km radius commitment)

## Onboarding pipeline (founder workflow — AU edition)

1. **Source** (Week 1-4):
   - AU Hindu temple authorities — Sri Venkateswara Temple Helensburgh (Sydney), Shiva Vishnu Temple Carrum Downs (Melbourne), Hindu Society of Queensland Burbank (Brisbane), BAPS chapters (Sydney + Melbourne)
   - WhatsApp groups: "Hindu Pandits Australia", "Indian Diaspora Sydney", "Telugu Association of Australia"
   - LinkedIn: AU-based Sanskrit Pathshala alumni; ex-priests from major AU temples
   - Community newspapers (Indian Link, Indus Age, Sanskruti Australia)
2. **Pre-screen** (Week 2-5): 20-min video call. Confirm willingness, AUD pricing tier, weekly availability, sampradaya specialization, AU compliance docs.
3. **Verification submission** (Week 3-6): Pandit fills onboarding form (existing `/pandit/onboard` works for capture; AU-specific compliance fields need engineering ticket). Uploads docs.
4. **Verification** (Week 4-7): Founder OR AU-based coordinator does live video review of original documents + reference checks + temple authority confirmation.
5. **Activation** (Week 5-8): Profile published with AUD pricing. First test booking (founder or seeded AU devotee). Stripe AUD payout flow validated.
6. **First-month review** (Week 8-10): Rating + repeat-rate check. Re-validate if any issues.

## Pricing strategy (AU tier)

AU pandits price in AUD direct (not INR-converted). Reference NRI rate ratio (9-10× domestic per business rule #2) but localize to AU cost-of-living + AUD strength.

| Puja type | Domestic INR (Mumbai tier-1) | AU AUD | AU USD equivalent (peg check) |
|---|---|---|---|
| Satyanarayan Katha | ₹3,000 | $150 AUD | ~$100 USD |
| Griha Pravesh | ₹5,000 | $250 AUD | ~$165 USD |
| Rudrabhishek | ₹4,000 | $200 AUD | ~$130 USD |
| Wedding ceremony (per day) | ₹20,000 | $1,200 AUD | ~$790 USD |
| Antim Sanskar | ₹7,000 | $400 AUD | ~$265 USD |
| Navagraha Shanti | ₹8,000 | $450 AUD | ~$295 USD |
| Mahamrityunjaya 1.25 lakh jaap | ₹15,000 | $750 AUD | ~$495 USD |
| Vastu consultation (in-home, per hr) | ₹2,500 | $200 AUD | ~$130 USD |

Platform commission: **30% AU tier** (higher than India tier-2 25% — accounts for Stripe AUD fees ~2.9% + AUD-INR repatriation costs + AU GST handling).

GST: pandits over AUD $75k/year revenue must register for GST. Bhaktisetu surfaces GST inclusion in invoice line items; pandit responsible for AU ATO filings.

## Engineering tickets (dependencies — VERIFY BEFORE FOUNDER GO-LIVE)

- [x] `R-Q1-S-002a` Pandit onboarding pipeline (shipped — `/pandit/onboard`)
- [x] `R-Q1-S-002c` Booking workflow with video proof (shipped — mandatory per business rule #1)
- [x] `R-Q1-E` Payout system (shipped — gated on Aadhaar verified)
- [ ] **NEW** AU compliance fields on Priest model: `abn`, `wwccNumber`, `wwccExpiresAt`, `auBankBsb`, `country` (default `IN`, allow `AU`). Owner: engineering, separate ticket.
- [ ] **NEW** Identity verification path that accepts AU equivalents (passport / Medicare / driver's licence) — `aadhaarVerified` rule must be widened to `identityVerified` w/ jurisdiction-aware proof type. Owner: engineering, separate ticket. **Blocks AU pandit payouts until shipped.**
- [ ] **NEW** Stripe AU AUD rail enabled on Priest payout — verify Stripe Connect AU country code accepted on `/api/v1/payouts`
- [ ] **NEW** City-filter on `/pandits?country=au&city=sydney` listing — verify renders
- [ ] **NEW** AU city pages — `/city/sydney`, `/city/melbourne`, `/city/brisbane` should include pandit grid + AUD pricing
- [ ] Per-pandit profile page hits 200 in prod for AU pandits
- [ ] WhatsApp / SMS notification on booking → pandit honors AU phone format (+61)
- [ ] Time-zone-aware scheduling — `/pujas/[id]/book` shows times in pandit's TZ (AEST) and devotee's TZ (IST) for cross-zone bookings

## Coordinator handoff (if founder hires AU local)

If founder hires an AU-based supply coordinator (recommended — cheaper than founder flights):

- Stipend: AUD $1,500/month + AUD $200 per onboarded + verified pandit (target 2-3/month)
- Owns: sourcing via local temple network, pre-screening, doc collection, video-call verification facilitation
- Reports: weekly to founder via WhatsApp + Bhaktisetu admin dashboard
- Travel allowance: AUD $300/month for in-person visits across Sydney metro (or equivalent for Melbourne / Brisbane coordinator)

## Founder action items

1. **AU temple outreach** — email/WhatsApp the 4-5 major AU Hindu temples requesting introductions to their officiating pandits + community recommendations. Templates ready in `docs/supply/au-temple-outreach-templates.md` (separate doc — TBD if needed).
2. **AU diaspora WhatsApp groups** — join 5-10 community groups (Sydney Indians, Melbourne Telugu Association, Brisbane Hindu Council). Post pandit-recruitment ask.
3. **Hire or contract an AU coordinator** — Sydney or Melbourne based (start one city, expand to second after first 5 pandits live).
4. **Engineering co-ordination** — schedule sprint w/ engineering to ship 2 dependency tickets (AU compliance fields + identity verification widening). Roughly 1 sprint each. Without these, AU pandits cannot receive payouts.
5. **Run first 2 onboardings end-to-end yourself** (one Sydney, one Melbourne) before delegating — proves AU compliance pipeline works.
6. **Track Supabase `Priest` table country='AU' weekly** via `/admin/supply?country=au` (admin filter ticket separate).

## Success metric (Q4 close)

- **10 pandits live + verified** across Sydney (4) + Melbourne (4) + Brisbane (2)
  - Supabase query: `SELECT COUNT(*) FROM "Priest" WHERE country='AU' AND identity_verified=true AND status='ACTIVE'`
  - Validation: 4+ in Sydney, 4+ in Melbourne, 2+ in Brisbane (no concentration in single metro)
- **First 10 AU bookings completed Q4** (downstream KPI — R-Q4-G-001 blocked on this item)
- **Average rating 4.5+/5**
- **Repeat-customer rate 25%+** within 90 days
- **80%+ pandit retention** (post-onboarding 60-day churn check)
- **AUD revenue ≥ AUD $5,000 (first month live)** — single Wedding ceremony covers ~25% of this target

## Risk + mitigation

| Risk | Mitigation |
|---|---|
| Engineering dependency blocks payout for AU pandits | Block all AU recruitment until identity-verification + AU compliance fields ship; founder co-ordinates sprint |
| Pricing pushback (some AU pandits expect higher AUD rates) | Show 70% take-home share + AU cost-of-living math + lack of existing platform competition |
| AU pandit comfort with smartphone onboarding | Coordinator does video-call handholding; provide AU English-language onboarding guide |
| WWCC delays (AU state-level processing — 4-6 weeks) | Pre-onboard pandits w/o WWCC for adult-only ceremonies first; restrict mundan/annaprashan listings until WWCC arrives |
| Sampradaya gaps (e.g. no Tamil pandit in Brisbane) | Cross-metro fulfillment via live Jitsi sankalp for niche ceremonies; expand to Perth + Adelaide in Q1 2027 if Q4 succeeds |
| AUD-INR repatriation cost | Stripe AU 2.9% + 30¢ AUD per transaction; Wise / Airwallex for batch INR repatriation (cheaper than direct Stripe fees) |
| AU ATO GST audit risk | Pandit responsible for own GST filings; Bhaktisetu surfaces gross AUD on each invoice for clarity |
| Founder bandwidth — 3 metros + AU travel | Phase: Sydney 4 in Month 10, Melbourne 4 in Month 11, Brisbane 2 in Month 12 (overlapping) |
| Existing AU pandit WhatsApp networks may resist platform | Position Bhaktisetu as additional revenue stream, not replacement; let them retain direct clients |

## Sampradaya specifics — AU diaspora

- **Sydney**: Strong South-Indian (Tamil + Telugu — Helensburgh), Gujarati (BAPS Rosehill), North-Indian (Hindu Council of Australia Westmead)
- **Melbourne**: Telugu (Carrum Downs), Gujarati (BAPS Mill Park), Tamil (Sri Murugan Temple Carrum Downs), Marathi (active diaspora — Maharashtra Mandal Victoria)
- **Brisbane**: North-Indian (Hindu Society of Queensland Burbank), small Tamil diaspora (growing)
- **Customs cadence**: Diwali peaks Oct-Nov (AU spring), Navratri Sept-Oct, Pongal/Sankranti Jan, Janmashtami Aug. AU public holiday clashes: Diwali rarely falls on weekend → after-work + Saturday slots
- **Time-zone**: AEST (Sydney + Melbourne + Brisbane) is UTC+10. Daylight saving (Sydney + Melbourne) shifts to UTC+11 Oct-Apr. Brisbane stays UTC+10 year-round. Confirm in pandit calendar UI.

## Closes

- R-Q4-S-004 (this item — when KPI hits 10)
- Enables R-Q4-G-001 (AU-targeted geo expansion — blocked on AU supply per `blocks:` field in spec)
- Enables AU NRI revenue stream Q4 onward (target AUD $30k/quarter run-rate by Q1 2027)

## Open questions for founder

1. **Coordinator hire**: Sydney first or Melbourne first? Recommend Sydney (largest diaspora + Helensburgh temple network).
2. **Founder AU visit**: Q4 has 3 months. Schedule 7-10 day trip covering Sydney + Melbourne + Brisbane (Sydney is required for first 2 onboardings)?
3. **Engineering sprint scheduling**: Identity verification widening + AU compliance fields — can these ship by end of Month 10? If not, AU pandit recruitment stalls.
4. **Pricing review**: Confirm AUD pricing tier above (or adjust). Compare to Sri Mandir AU listings + standalone AU temple pandit rates.
5. **Stripe Connect AU**: Verify Stripe account supports AU Connect (some Bhaktisetu Stripe setups are India-only — confirm with engineering before pandit recruitment).
