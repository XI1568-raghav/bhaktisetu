# WhatsApp Cloud API — Business Verification Submitted

> **Roadmap item**: R-Q1-M-010 (P1) · **Authored**: 2026-06-13 · **Unblocks**: U7

## Goal

Q1 submit WhatsApp Cloud API business verification via Meta Business Suite. Unblocks WA blasts at scale (1000/mo free tier) + green-tick verified.

## Pre-req

### Meta Business Suite setup
- Founder creates Meta Business account: business.facebook.com
- Adds "Bhaktisetu Foundation" as business name
- Verifies founder personal FB profile linked
- Adds business documents (Section 8 cert + PAN)

### Phone number
- Dedicated WA number for Bhaktisetu (NOT founder personal)
- New SIM or existing Bhaktisetu Foundation number
- Must NOT have prior WhatsApp account on this number
- Format: +91-XXXXX-XXXXX

## WhatsApp Cloud API steps

1. Meta Business Suite → WhatsApp → Get Started
2. Connect Bhaktisetu Foundation business
3. Add phone number → Meta sends OTP → verify
4. Add display name: "Bhaktisetu" (must match brand)
5. Submit business verification (review 3-5 days)
6. Once approved → 1000 free WA conversations/mo

## Use cases (post-approval)

- Booking confirmations (10/day est)
- Live darshan reminders (50/day est at peak)
- Daily aarti notifications (opt-in only, 100/day)
- Festival promo blasts (1× per festival, 100/festival)
- Founder support (R-Q1-CS-002 fallback)

## Cost model

- 1000 conversations free/mo
- Beyond: $0.005 per business-initiated conversation India
- Estimated Q2 monthly: ~700 conversations = within free tier
- Q4 forecast: 1500 conversations = ~$2.50/mo (negligible)

## Template messages (Meta approval required)

- `booking_confirmation` — Hindi + English variants
- `darshan_reminder` — Hindi + English
- `festival_promo` — per-festival template
- `support_ticket_response` — generic

Each requires Meta approval (24-48hr).

## Engineering tickets

- R-Q1-M-010a: Meta Business account setup
- R-Q1-M-010b: WA Cloud API phone setup + verify
- R-Q1-M-010c: Business verification submission
- R-Q1-M-010d: 4 template messages submitted
- R-Q1-M-010e: API integration in apps/api/services/whatsapp.ts

## Closes

R-Q1-M-010 — spec shipped.
