<!-- TC-01 / TC-08 (trust audit): the 80G deduction promise and the "verified
pandit" adjective were removed from this template. Darshya holds no Section 80G
registration (apps/web/lib/company.ts HAS_80G_VERIFIED is false, pan and
eightyGNumber null) and apps/api/src/lib/pdf-receipt.ts is80GEligible() needs a
donee 80G number AND PAN read from gaushala_profiles columns no route writes; and
nothing promotes a Priest to verified outside apps/api/prisma/seed.ts. This file
is plain markdown a human copies into a real message, so there is nothing to gate
it on: restore the wording by hand the day apps/api/src/lib/eighty-g.ts HAS_80G
and apps/api/src/lib/pandit-vetting.ts HAS_PANDIT_VETTING are both true. -->

# Astrologer outreach v1 — R-Q1-S-007

> **Status**: DRAFT — REQUIRES FOUNDER APPROVAL before any send. · **Date**: 2026-06-12 · **Channels**: WhatsApp (primary) + Email (fallback).

## Hard rules

1. **No fabricated claims.** Do not say "10,000 devotees waiting" — say what's true ("growing devotee base, public traffic visible at darshya.online").
2. **No medical / legal / financial advice promised on the platform.** Astrologers making those claims are auto-rejected.
3. **Aadhaar payout gate disclosed up front.** Per platform policy, no payout until DigiLocker-pulled Aadhaar verification clears.
4. **No mass send.** First 25 must be hand-personalised per prospect.
5. **Reply-to inbox monitored daily by founder/sales rep.** No black-hole sends.

## Variables (replace per-prospect)

- `{first_name}` — first name only
- `{specialty}` — Vedic / KP / Lal Kitab / Numerology / Vastu / Nadi / Prashna
- `{public_artifact}` — single concrete reference: their YouTube channel, AstroSage page, ICAS profile, their book/article
- `{city}` — city of practice

---

## WhatsApp — Hindi/English mixed (primary channel)

```
Namaste {first_name} ji 🙏

Main {sender_name}, Bhaktisetu (darshya.online) ka co-founder/sales lead. Aapka {public_artifact} dekha — {specialty} mein aapka kaam impressive hai.

Hum NRI + India devotees ke liye astrologer marketplace bana rahe hain, jismein har profile admin-approved hoti hai. Aapko fit dekhta hoon — agar interested ho, 5 min ki call kar sakte hain?

Quick context:
• Per-minute pricing aap decide karte ho (₹50–₹150 typical range)
• Revenue split: 70% aapko / 30% platform
• Payout: weekly, Aadhaar verified ke baad (DigiLocker pull, koi upload nahi)
• Sample 5-min reading record karna padega — unlisted YouTube link bhi chalega
• English + Hindi clients dono mil sakte hain

Kya next week 15 min nikal sakte hain? Reply with "Yes" + preferred time slot.

Dhanyavad,
{sender_name}
+91-{sender_phone} | {sender_email}
darshya.online
```

### WhatsApp shorter follow-up (3 days after no reply)

```
Namaste {first_name} ji, follow-up — kya aapko Bhaktisetu astrologer panel ke baare mein 2 min ki chai-time chat ki ichha hai? Reply "Yes/No/Later" — aapka time waste nahi karenge. 🙏
{sender_name}
```

---

## Email — English (fallback for prospects who prefer email)

**Subject**: Bhaktisetu — admin-approved astrologer panel ({specialty}) — 5 min chat?

```
Namaste {first_name} ji,

I am {sender_name}, co-founder/sales lead at Bhaktisetu (darshya.online). I came across your {public_artifact} and was impressed by your work in {specialty} astrology.

We are building an astrologer marketplace for NRI + India devotees where every profile is admin-approved before it can take a consultation, and your profile is a strong fit. Wanted to introduce the platform and check interest in joining our launch panel.

Quick highlights:

• Per-minute pricing controlled by you (₹50–₹150 typical, no platform-imposed cap)
• 70/30 revenue split (you / platform)
• Weekly payouts, gated on Aadhaar verification via DigiLocker (no document upload — we pull from the official source)
• Onboarding requires:
  (a) one 5-minute sample reading recorded (unlisted YouTube link works)
  (b) DigiLocker-based Aadhaar KYC (one-time, ~3 min)
  (c) Your per-minute price + availability window
• You retain client relationships — we do not lock you in or take exclusivity
• No medical, legal, or financial advice claims permitted (platform policy)

Would you be open to a 15-minute call next week to discuss? Reply with a few time slots that work and I will send a calendar invite.

For reference, the platform: https://darshya.online/astrology

Dhanyavad,
{sender_name}
{sender_phone} | {sender_email}
Bhaktisetu — darshya.online
```

### Email follow-up (7 days after no reply)

**Subject**: Re: Bhaktisetu astrologer panel — quick check-in

```
Namaste {first_name} ji,

Following up on my earlier note. No pressure — wanted to confirm whether you received the previous email and whether the timing is right for you. A simple "interested / not now / not for me" is helpful so I do not keep your inbox busy.

If interested but busy, even a 5-minute WhatsApp voice note about your panel preferences would be enough to move forward.

Best,
{sender_name}
```

---

## Send checklist (per prospect)

- [ ] Public profile verified live (URL returns 200, not parked / dead)
- [ ] No medical / legal / financial claims found in their public material
- [ ] 3+ year public presence confirmed (first content ≥ 2023)
- [ ] Variables filled in — NO `{...}` placeholders left
- [ ] Personalised line about specific public artifact (channel name, book, article)
- [ ] Sender block uses real founder/sales rep name + replyable phone+email
- [ ] CSV `outreach_status` flipped NEW → SENT_DAY_0 with timestamp
- [ ] Reply ETA tracked — flip to REPLIED / NO_REPLY_FOLLOWUP_1 / NO_REPLY_FOLLOWUP_2 / DECLINED / CONVERTED

## Tracking

Update `data/sales/leads-astrologers-2026-06-12.csv` `outreach_status` per prospect. Lifecycle:

```
NEW → SENT_DAY_0 → (REPLIED | NO_REPLY_FOLLOWUP_1) → (REPLIED | NO_REPLY_FOLLOWUP_2) → (CONVERTED | DECLINED | DEAD)
```

KPI for this cycle: 25 prospects sent → 10 replies → 5+ converted to onboarding pipeline → 10 verified-active in DB by Jan 31 (Phase 2).
