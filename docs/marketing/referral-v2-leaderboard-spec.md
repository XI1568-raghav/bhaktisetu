# Referral Program v2 — Affiliate Rewards Launch + Leaderboard

> **Roadmap item**: R-Q3-M-013 (P2) · **Authored**: 2026-06-13 · **Extends**: R-Q2-M-011 v1 + R-Q3-E-009 affiliate

## Goal

Q3 ship referral v2 w/ leaderboard + tiered rewards. Targets 200+ active referrers.

## Tier escalation

| Tier | Successful referrals | Reward |
|---|---|---|
| Bronze | 1-2 | ₹100/referral wallet credit (v1 baseline) |
| Silver | 3-5 | ₹150/referral + Silver badge |
| Gold | 6-10 | ₹200/referral + free puja/month |
| Platinum | 11+ | ₹300/referral + free yatra package/year |

## Leaderboard (live from R-Q2-M-011 stub → real)

`/refer/leaderboard`:
- Top 50 referrers monthly
- Anonymized: "Devotee from Mumbai #1" w/ count + tier
- Weekly digest email to all top-100

## Anti-fraud

- Self-referral block (R-Q2-M-011 already)
- Multi-account detection (same IP + same browser fingerprint)
- Manual review trigger on >20 referrals/week

## Engineering tickets

- R-Q3-M-013a: Tier logic + auto-promotion
- R-Q3-M-013b: Live leaderboard page
- R-Q3-M-013c: Weekly digest email
- R-Q3-M-013d: Anti-fraud detection

## Q3 success

- 200+ active referrers
- 50+ paid signups via referral
- ₹50K wallet credits issued
- Top-10 referrer >20 successful refers

## Closes

R-Q3-M-013 — spec shipped.
