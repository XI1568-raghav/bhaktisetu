# AI Pandit MVP Launch — ₹199/mo Subscription + 3 Free Questions/Day

> **Roadmap item**: R-Q2-P-001 (P0) · **Authored**: 2026-06-13 · **Depends on**: R-Q2-E-001 backend

## Goal

Q2 launch AI Pandit subscription product. ₹199/mo unlimited Q&A + free 3 questions/day for unpaid users. Targets 50 paying subscribers Q2-end (₹10K MRR).

## Product positioning

**For**: Hindus seeking quick Vedic / Hindu guidance without booking a pandit consultation
**vs**: Generic ChatGPT (lacks Sanskrit + scripture grounding) / real pandit (slower + expensive)
**Why**: Bhaktisetu = Sanskrit-trained AI w/ scripture citations + tone-appropriate (devotional, respectful)

## Pricing tiers

| Tier | Price | Q&A limit | Other |
|---|---|---|---|
| Free | ₹0 | 3/day | No follow-ups |
| Bhakti Pro | ₹199/mo | Unlimited | Follow-ups + chat history + advanced kundli questions |
| Bhakti Bhagat | ₹1499/yr (-37%) | Same as Pro + 1 free real-pandit consult/yr | Annual commitment |

Razorpay Subscription via R-Q1-E-017 wiring.

## Onboarding flow

1. /ask-pandit → free user lands, asks first Q → AI answers + "2 free remaining"
2. After 3rd: paywall "Upgrade to Bhakti Pro ₹199/mo for unlimited"
3. Click upgrade → Razorpay subscription checkout
4. Success → unlocked unlimited

## Feature gates

- Free: text only, no chat history, no kundli questions
- Pro: text + chat history (last 100 Qs) + kundli-aware (uses user's birth chart from /astrology/kundli) + downloadable Q&A as PDF
- Bhakti Bhagat: Pro + 1 real-pandit consult voucher/year (₹2K value bundled free)

## UX flows

### Free user
- 3 questions per day, daily reset
- Counter "1 of 3 today" displayed
- Soft upsell after each answer: "Upgrade for follow-ups"

### Paid user
- No counter visible
- "Pro" badge in profile
- Auto-renew + cancel anytime UI

## Engineering tickets

- R-Q2-P-001a: Tier check middleware
- R-Q2-P-001b: Paywall UI component
- R-Q2-P-001c: Razorpay subscription checkout
- R-Q2-P-001d: Tier change events → email
- R-Q2-P-001e: Chat history feature

## Success metric

- 50+ subscribers Q2-end
- 1000+ free users converted from /ask-pandit
- LTV >₹500 (2.5× CAC)

## Closes

R-Q2-P-001 — spec shipped.
