# Adopt-A-Temple Monthly Subscription Engine — Recurring CSR Match

> **Roadmap item**: R-Q4-E-012 (P1) · **Authored**: 2026-06-13 · **Foundation for**: R-Q4-M-007 CSR match

## Goal

Q4 ship adopt-a-temple monthly subscription. ₹501/₹1001/₹2501 tiers per temple. Recurring revenue + foundation for CSR 2x match (R-Q4-M-007).

## Product

Like adopt-a-cow (R-Q2-P-004) but for temple maintenance + daily seva.

| Tier | ₹/mo | Inclusion |
|---|---|---|
| Basic | ₹501 | Temple aarti dedicated in donor's name (1×/week) + 80G receipt |
| Standard | ₹1001 | Above + monthly impact PDF (which seva funded) + photo update |
| Premium | ₹2501 | Above + video update + plaque (donor name at temple stall) + annual visit-pass |

## Engineering tickets (mirrors R-Q2-P-004 cow adopt)

- R-Q4-E-012a: TempleAdoption Prisma model
- R-Q4-E-012b: Razorpay subscription wiring
- R-Q4-E-012c: /temples/{slug}/adopt page
- R-Q4-E-012d: Monthly impact PDF generator (per donor)
- R-Q4-E-012e: Admin temple-adoption dashboard

## CSR 2x match integration (R-Q4-M-007)

- Corporate sponsor commits ₹X to match all donations in window
- Per-donor email shows "Your ₹501 matched 2x = ₹1002 toward Kashi maintenance"
- Co-branded landing: "Powered by {Corporate} CSR + Bhaktisetu"

## Q4 success

- 100+ adoptees Q4
- ₹1L recurring MRR (temple adopt + cow adopt combined)
- 80%+ Month-3 retention

## Closes

R-Q4-E-012 — spec shipped.
