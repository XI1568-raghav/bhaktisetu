# Join Waitlist Modal — Phone + WA Opt-In on Every Public Puja Page

> **Roadmap item**: R-Q1-P-009 (P0) · **Authored**: 2026-06-13

## Goal

Add "Join waitlist" modal w/ phone + WA opt-in to every public puja page. Capture intent from /pujas browse traffic when user not ready to book.

## Trigger

Modal opens via 3 paths:
1. Click "Notify me when available" button on /pujas/[slug] (when puja sold-out OR pre-launch)
2. Exit-intent detector (user moves mouse to browser close on /pujas/[slug])
3. Scroll-depth 60% on /pujas/[slug] w/ session duration >30sec

Each path fires modal at most once per session (sessionStorage flag).

## Modal UI

```
┌──────────────────────────────────────┐
│ Get notified when "Rudrabhishek"     │
│ is available 🪔                       │
├──────────────────────────────────────┤
│ [Phone: +91 ____________]            │
│ ☐ Yes, I want WhatsApp updates       │
│   (no spam, opt-out anytime)         │
│                                       │
│ [Notify me]  [Skip]                  │
└──────────────────────────────────────┘
```

Phone field auto-detects country code. WA opt-in checked by default. Skip button closes + flags sessionStorage.

## API endpoint

`POST /api/v1/waitlist/puja-interest`:
```typescript
body: { phone, pujaSlug, waOptIn }
```

Creates `PujaInterest` row:
```prisma
model PujaInterest {
  id        String   @id @default(cuid())
  phone     String
  pujaSlug  String
  waOptIn   Boolean
  createdAt DateTime @default(now())
  @@unique([phone, pujaSlug])
  @@index([pujaSlug])
  @@map("puja_interests")
}
```

## Notify trigger

When puja becomes available OR price drops:
- Cron scans PujaInterest WHERE waOptIn=true
- Sends WA message (template_message via R-Q1-M-010 WA Cloud)
- "Namaste! Rudrabhishek is now available at Bhaktisetu. Book now: bhaktisetu.com/pujas/rudrabhishek?utm_source=wa_waitlist"

## Engineering tickets

- R-Q1-P-009a: Modal component (apps/web/components/WaitlistModal.tsx)
- R-Q1-P-009b: 3 trigger detectors (button click + exit-intent + scroll)
- R-Q1-P-009c: API endpoint + Prisma migration
- R-Q1-P-009d: Notify cron + WA template

## Closes

R-Q1-P-009 — spec shipped.
