# Referral ₹100 Credit Each Side — After First Paid Booking

> **Roadmap item**: R-Q1-P-006 (P2) · **Authored**: 2026-06-13 · **Sibling**: R-Q2-M-011 v1

## Goal

Q1 ship two-sided ₹100 wallet credit on referral conversion. Inviter + invitee both get ₹100.

## Vs single-sided (R-Q1-M-015)

- M-015: inviter ₹100 only
- P-006: BOTH sides ₹100 (better viral coefficient, slightly higher cost)

## Decision (Q1 founder)

Test both single-sided vs two-sided as A/B (per R-Q1-E-009 PostHog flags):
- 50% users: single-sided (inviter only)
- 50% users: two-sided

After 4 weeks, compare:
- Referral attempt rate (does two-sided drive more shares?)
- Cost per acquired user
- LTV of acquired user

## V0 vs full V1

Q1 P-006 = base credit logic. R-Q2-M-011 = full SSR /refer + share buttons + middleware cookie.

## Engineering tickets

- R-Q1-P-006a: Two-sided credit logic
- R-Q1-P-006b: A/B variant assignment
- R-Q1-P-006c: Wallet credit display in user profile

## Closes

R-Q1-P-006 — spec shipped.
