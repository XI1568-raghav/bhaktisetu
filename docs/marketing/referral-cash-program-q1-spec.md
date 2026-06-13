# Referral Cash Program — ₹100 Credit Per Converting Referee

> **Roadmap item**: R-Q1-M-015 (P2) · **Authored**: 2026-06-13 · **Sibling**: R-Q2-M-011 (formal launch v1)

## Goal

Q1 ship referral cash program v0. Wallet credit only (no leaderboard). Sets foundation for R-Q2-M-011 v1 + R-Q3-M-013 v2.

## V0 mechanics

- Existing user gets unique 6-char referral code
- Shares via WA "Sign up via my code BHAK1234 for ₹100 bonus"
- Friend signs up + completes first paid booking
- Inviter wallet auto-credited ₹100 (10000 paise)
- 1:1 idempotent (one inviter per invitee)

## V0 vs V1 (R-Q2-M-011)

| Feature | V0 (this) | V1 (R-Q2-M-011) |
|---|---|---|
| Manual share | ✓ | ✓ |
| Auto-cookie attribution | ✗ | ✓ |
| /refer page | Basic | Full SSR + share buttons |
| Leaderboard | ✗ | Stub |
| Founder-handled credits | ✓ | Auto |

## Engineering tickets

- R-Q1-M-015a: Wallet credit cron (founder-manual Q1)
- R-Q1-M-015b: User profile shows referral code
- R-Q1-M-015c: Simple landing /refer page

## Closes

R-Q1-M-015 — spec shipped.
