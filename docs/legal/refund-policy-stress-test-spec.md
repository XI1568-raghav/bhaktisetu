# Refund-Policy Stress Test + Real Lawyer Review

> **Roadmap item**: R-Q1-L-002 (P2) · **Authored**: 2026-06-13

## Goal

Q1 stress-test refund policy w/ 10 edge cases + lawyer review. Closes legal exposure on disputes.

## 10 edge cases stress tested

| # | Case | Current policy | Edge risk |
|---|---|---|---|
| 1 | Pandit no-show (proven) | 100% refund | None |
| 2 | Pandit no-show (disputed by pandit) | Investigation + 50% pending | Dispute escalation |
| 3 | Video proof missing | 100% refund | Bhaktisetu liability |
| 4 | User cancels >24hr | 100% refund | Standard |
| 5 | User cancels <24hr | 50% refund | Pandit advance work |
| 6 | User no-show at scheduled time | 0% refund | User can claim disability/emergency |
| 7 | Tech failure (Bhaktisetu side) | 100% refund + credit | OK |
| 8 | NRI payment chargeback (Stripe) | Force refund per Stripe rules | Bhaktisetu absorbs |
| 9 | Booking date confusion (system bug) | 100% refund + free re-book | Bhaktisetu liability |
| 10 | Pandit performs but family unsatisfied | Mediation, partial refund | Subjective, hardest |

## Lawyer review

Tier-2 Bengaluru firm engagement ₹50K Q1. Output:
- Refund policy doc legally sound + DPDP/India consumer law compliant
- Dispute resolution clause finalized
- Force majeure carve-out
- Mediation/arbitration clause

## Engineering tickets

- R-Q1-L-002a: Lawyer engagement
- R-Q1-L-002b: 10-case stress test doc
- R-Q1-L-002c: Policy update on /legal/refund
- R-Q1-L-002d: Dispute admin UI per case type

## Closes

R-Q1-L-002 — spec shipped.
