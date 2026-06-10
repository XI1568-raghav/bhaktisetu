# LEGAL Advisory — 2026-W24

> Auto-generated weekly. Decision Agent reads this. Founder override OK.

## Owned items snapshot
- Total: 10
- Planned: 10
- In progress: 0
- Shipped: 0
- Verified: 0
- Blocked: 0

## Top 5 ready-to-ship (revenue/hour desc)
- **R-Q1-L-002** Refund-policy stress test + real lawyer review — ₹15,000 / 4h (P2)
- **R-Q2-L-002** Priest contracts signed — 100 pandits with revenue-share template — ₹0 / 24h (P1)
- **R-Q3-L-001** DPDP user-rights audit — DSAR endpoint + consent log + 30-day SLA + counsel sign-off — ₹0 / 24h (P0)

## Founder-blocked
- R-Q3-L-002 blocked by U2: GDPR compliance for UK NRI launch — DPA + cookie banner + lawful basis register
- R-Q4-L-002 blocked by U6: Temple chain master agreement — anchor chain commercial + revenue share + IP + indemnity

## Live KPIs (this role)
_No matching KPIs cached yet — run orchestrator first cycle_

## Dept doctrine (top 30 lines of 08-legal.md)
```
# Darshya — Legal Lead Brief

> This is not legal advice. Consult a qualified Indian lawyer before acting on any item.
> I am an assistant playing "Legal Lead" for the founder, not a lawyer. Anything below is
> a starting point for a conversation with a real practitioner — especially the rupee figures,
> which I could not verify via WebSearch this session (the search tool errored out) and which
> shift year to year. Treat costs as order-of-magnitude only.

Author role: Legal Lead (assistant). Audience: Darshya founder (Sunil/Darshya solo, pre-incorp).
Live status: product is shipping, charging payments, accepting NRI traffic, not yet incorporated
(`apps/web/lib/company.ts:36` — `IS_INCORPORATED_VERIFIED: false`).

---

## 1. Pre-launch incorporation question

**Recommendation: incorporate now, before NRI revenue scales past trivial volumes.**
The question is not "Pvt Ltd vs sole-prop forever" — it is "how many months of personal liability
am I willing to carry while I get to PMF." Honest tradeoff:

- **Sole proprietorship today**: zero registration cost, file ITR-3 / ITR-4 against your PAN,
  GST registration if turnover crosses the services threshold (commonly cited at INR 20 lakh,
  verify current). Razorpay onboards a sole-prop. Cheap and fast — but **you personally are the
  contracting party** for every devotee, every priest, every refund dispute. A single class-action-
  flavoured grievance over a "fake" puja, a chargeback wave from NRI cards, or a tax notice lands
  on your personal balance sheet with no veil.
- **Private Limited (Pvt Ltd) via SPICe+**: typical all-in cost commonly cited in the
  INR 7,000–15,000 range for government fees + DSC + DIN + name reservation, plus
  CA/CS professional fees of roughly INR 5,000–15,000 (verify with a current CA).
  Annual ROC compliance (AOC-4, MGT-7, DIR-3 KYC, statutory audit if applicable, board
```

## Recommended next-cycle prompts for Decision Agent
1. Spawn legal-agent on R-Q1-L-002 (Refund-policy stress test + real lawyer review) — refund_policy_lawyer_reviewed 0/1 count
1. Spawn legal-agent on R-Q2-L-002 (Priest contracts signed — 100 pandits with revenue-share template) — priest_contracts_signed 0/100 count
1. Spawn legal-agent on R-Q3-L-001 (DPDP user-rights audit — DSAR endpoint + consent log + 30-day SLA + counsel sign-off) — dpdp_audit_complete 0/1 count
