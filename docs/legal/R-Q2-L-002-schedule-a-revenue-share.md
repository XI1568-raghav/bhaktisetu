# Schedule A — Per-Puja Revenue Share Matrix

> Referenced by: `docs/legal/priest-contract-template-100-pandits.md` §2.4
> Authored: 2026-06-15 · Roadmap: R-Q2-L-002

## Default split policy

| Pandit tier | Default pandit share | Bhaktisetu share | Notes |
|---|---|---|---|
| New (0–6 mo on platform) | 70% | 30% | Probation period; covers KYC + onboarding overhead |
| Standard (6 mo – 3 yr) | 75% | 25% | Default tier after first 25 completed pujas + 0 unresolved disputes |
| Senior (3+ yr OR ≥500 completed pujas) | 80% | 20% | Honored vidwan tier; surfaces in temple "Featured Pandit" carousel |

Splits computed on **devotee net payment** (after Razorpay/Stripe processor fees, before TDS deduction). Bhaktisetu retains its share, deducts TDS u/s 194J at 10% from pandit share if applicable, remits net to pandit bank account.

## Per-puja-type overrides

| Puja type | Base price (₹) | Pandit share override | Reason |
|---|---|---|---|
| **Daily Aarti (live)** | 251 | Default | Standard offering |
| **Rudrabhishek (1hr)** | 1,100 | Default | Standard |
| **Satyanarayan Katha** | 2,100 | +2% bonus | Long-duration (3hr); requires multi-day prep |
| **Maha Mrityunjaya Jaap (1.25 lakh)** | 21,000 | +5% bonus | Multi-pandit team; 5–7 day yagya |
| **Navagraha Shanti** | 5,100 | Default | Standard |
| **Griha Pravesh** | 11,000 | Default | On-location (pandit travels) — travel reimbursed separately |
| **Vivah (wedding)** | 25,000–75,000 | +3% bonus | Premium emotional weight; high pandit reputation risk |
| **Antyeshti / Pind Daan** | 5,100 | +5% bonus | Sensitive; specialist pandits (Gaya, Varanasi); higher dropout if underpaid |
| **Online Kundli Reading (30 min)** | 750 | Default | Astrology — different priest category but same template applies |
| **NRI Gift Puja (USD-priced)** | $25–$150 | Standard ₹-equivalent split | NRI premium accrues to Bhaktisetu (international payment processing) |

## Bonus mechanisms

1. **Video proof streak bonus** — 30 consecutive pujas w/ on-time video → +1% on next month's payouts
2. **Devotee 5★ rating streak** — 50 consecutive 5★ ratings → +1% on next month's payouts (caps at +3% combined w/ streak bonus)
3. **Quarterly cohort top-10 pandits by GMV** → ₹5,000 cash bonus + featured profile

## Penalty deductions

| Event | Deduction |
|---|---|
| Missed video upload (per template §3.2) | 100% of that puja's pandit payout withheld; reinstated if video uploaded within 7d w/ valid reason |
| No-show w/o 24h notice (template §4.2) | Full devotee refund + pandit charged ₹500 penalty (deducted from next payout cycle) |
| Late video (>72h, <168h) | 10% of puja payout deducted |
| Devotee 1★ rating w/ verified complaint | 25% payout withheld pending dispute resolution per `docs/specs/marketplace-v2-dispute-resolution-spec.md` |

## TDS handling

- Bhaktisetu deducts TDS u/s 194J at 10% on pandit payouts ≥ ₹30,000/yr aggregate
- TDS certificate (Form 16A) issued quarterly
- Pandits with valid PAN: 10% TDS. Without PAN: 20% per Section 206AA
- Pandits exceeding ₹10 lakh/yr aggregate must register for GST (advisory only — pandit's tax responsibility)

## Payout schedule

| Frequency | Cycle | Cutoff | Disbursal day |
|---|---|---|---|
| Daily (default) | Mon–Sun bookings completed (video uploaded) | 23:59 IST | Next 09:00 IST via Razorpay X batch |
| Weekly (opt-in) | Sun 00:00 – Sat 23:59 | Sat 23:59 IST | Mon 09:00 IST |

Minimum disbursal threshold: ₹100. Sub-threshold balances roll forward to next cycle.

## Schedule A version control

- **v1.0** (2026-06-15) — initial split + bonus matrix
- Amendments require pandit re-signature OR 30-day notice + opt-out window

## Founder action

- [ ] Counsel sign-off on TDS 194J interpretation (some consider pandit services exempt as religious vocation; lawyer must rule)
- [ ] Razorpay X batch payout API integration (engineering)
- [ ] Pandit-side payout history page (`/priest/payouts`) showing cycle, gross, TDS, net
- [ ] Quarterly Form 16A generation cron (Q1: 15-Jul, Q2: 15-Oct, Q3: 15-Jan, Q4: 15-Apr)

## Closes

Schedule A line of R-Q2-L-002. Cited by master contract template §2.4.
