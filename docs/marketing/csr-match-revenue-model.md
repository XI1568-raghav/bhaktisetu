# CSR Match — ₹4L Revenue Model (Bear / Base / Bull)

> Companion to `csr-match-campaign.md`. Q4 target: ₹4L net revenue from CSR-match program. Assumptions tagged `[ASSUMPTION]` — founder must validate before sales commits.

## Formula

```
Net revenue = Σ (account_ticket_size × admin_fee_pct − allocated_sales_ops_cost) per signed account
```

Where:
- `account_ticket_size` = total CSR funds committed by corporate (employee pledges + 2x match), per MoU
- `admin_fee_pct` = Bhaktisetu's slice of disbursed CSR funds (locked at 8% per MoU template) `[ASSUMPTION-1]`
- `allocated_sales_ops_cost` = founder time + Apollo seat + email infra + legal review, prorated per account

## Per-bracket unit economics

| Bracket | Employee pledge | Corp 2x match | Total ticket | Admin fee (8%) | Allocated cost | Net revenue per account |
|---|---|---|---|---|---|---|
| Bronze | ₹8L `[ASSUMPTION-2]` | ₹17L | ₹25L | ₹2.0L | ₹0.8L `[ASSUMPTION-3]` | **₹1.2L** |
| Silver | ₹17L `[ASSUMPTION-2]` | ₹33L | ₹50L | ₹4.0L | ₹1.2L | **₹2.8L** |
| Gold | ₹33L `[ASSUMPTION-2]` | ₹67L | ₹1Cr | ₹8.0L | ₹2.0L | **₹6.0L** |

## Scenarios

### Bear (probability 30% `[ASSUMPTION-4]`)

| Account | Bracket | Revenue |
|---|---|---|
| 1 signed | Bronze (₹25L) | ₹1.2L |
| TOTAL | — | **₹1.2L** |

**Miss target by ₹2.8L.** Likely cause: cold sequence fails to land a meeting, founder doesn't unlock warm intro, Diwali timing slips.

Action if Bear: rerun with Navratri 2027 timing, expand to mid-tier IT services (Cognizant / Capgemini India / Mphasis).

### Base (probability 50% `[ASSUMPTION-4]`)

| Account | Bracket | Revenue |
|---|---|---|
| 1 signed | Silver (₹50L) | ₹2.8L |
| 1 signed | Bronze (₹25L) | ₹1.2L |
| TOTAL | — | **₹4.0L** |

**HIT TARGET exactly.** Requires: 2 of 10 ICP accounts move past T+14 stage, MoU signed by T-45.

Action: ship as-planned. Quarterly reporting cadence locks recurring 2027 commitments.

### Bull (probability 20% `[ASSUMPTION-4]`)

| Account | Bracket | Revenue |
|---|---|---|
| 1 signed | Gold (₹1Cr) | ₹6.0L |
| 2 signed | Silver (₹50L each) | ₹5.6L |
| TOTAL | — | **₹11.6L** |

**Beat target by ₹7.6L (290%).** Likely if a Big-4 IT picks us as their entire Schedule VII Item III commitment for FY26.

Action: dedicate founder + 1 hire to MoU drafting + corporate-branded landing pages. Defer non-CSR roadmap items in Q4.

## Probability-weighted forecast

`E(revenue) = 0.3 × ₹1.2L + 0.5 × ₹4.0L + 0.2 × ₹11.6L = ₹0.36L + ₹2.0L + ₹2.32L = ₹4.68L`

Expected value ~₹4.68L. Comfortable buffer over ₹4L target.

## Assumption ledger

| Tag | Assumption | Source / Validation needed |
|---|---|---|
| `[ASSUMPTION-1]` | 8% admin fee acceptable to corporate CSR teams | NO benchmarking done; counsel review needed. Industry typical: 5-15% (TBR / Charities Aid Foundation benchmarks) |
| `[ASSUMPTION-2]` | Employee pledge ratio (~33% of total ticket) | Inferred from peer adopt-a-temple programs; needs founder validation. If actual employee participation is lower, corporate-match alone funds the program but employee mobilization optics weaker. |
| `[ASSUMPTION-3]` | ₹80K-2L allocated sales-ops cost per account | Founder hours (40hr/account × ₹2K/hr opportunity cost = ₹80K) + Apollo seat amortized + legal review |
| `[ASSUMPTION-4]` | Bear/Base/Bull probability split (30/50/20) | Gut. Historical conversion data zero — first cycle of this program. Refine after first 10 outbounds. |
| `[ASSUMPTION-5]` | All disbursed funds clear 80G tax test | Bhaktisetu Foundation 80G valid through 2028 confirmed per ops doc — but each corporate's CSR team verifies independently. Mitigation: provide cert copy + AY filing reference in MoU annexure. |
| `[ASSUMPTION-6]` | No regulator surprises mid-program | Schedule VII Item III stable since 2014 amendment. Low probability of mid-FY rule change. |

## Sensitivity table (admin fee × accounts signed)

Net revenue (₹L) for `admin_fee_pct` × signed accounts at Base mix (1 Silver + 1 Bronze):

| | 5% | **8%** | 10% | 12% |
|---|---|---|---|---|
| 1 Bronze | 0.45 | **1.2** | 1.7 | 2.2 |
| 1 Silver | 1.3 | **2.8** | 3.8 | 4.8 |
| Base (1S+1B) | 1.75 | **4.0** | 5.5 | 7.0 |
| Bull (1G+2S) | 3.0 | **11.6** | 14.0 | 18.0 |

If admin fee negotiates down to 5%, Base scenario misses target by ₹2.25L → need 3 accounts not 2.

## Cash flow timing

Per MoU template (draft):
- T-30 (MoU sign): 10% advance to lock temple slots (₹50K Bronze, ₹1L Silver, ₹2L Gold) — this is the admin fee, recognized as revenue
- T-0 (Diwali launch): employee mobilization begins
- T+30 (first month): monthly disbursement starts; admin fee on disbursed amount accrues
- T+90 (quarter end): first impact report; ongoing admin fee recognition

So Q4 cash recognition: 10% advances + ~3 months of disbursements = ~30% of total admin fee per account in calendar Q4 itself, rest spills into Q1-Q3 next FY. Target ₹4L = annualized; Q4-recognized portion ~₹1.2L.

**Revenue model footnote**: when reporting to investors, distinguish "MoU-signed CSR commitments" (annualized ₹4L) from "Q4 cash recognized" (₹1.2L). Both real, different metrics.

## Founder approval checklist

Before sales convo:
- [ ] 8% admin fee approved (or alternative locked)
- [ ] 80G + CSR-1 cert references confirmed
- [ ] MoU template legally reviewed
- [ ] Probability split refined after first 10 outbounds (update assumption-4)
- [ ] Bracket pricing tested in first call (Bronze too low? Silver right? Gold realistic?)

## Closes
Q-R-Q4-M-007-20260610T1623
