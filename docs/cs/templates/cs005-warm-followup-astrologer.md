# CS-005 Warm-Followup Template — Astrologer

> **Role**: ASTROLOGER · **Item**: R-Q1-CS-005 · **Use after**: IT-004 Resend DNS verify GREEN · **Tone**: respectful Hindi/Sanskrit-tinged, pilot framing

> **Correction 2026-09-02 (`OPS-10`).** The subject line used to read *"Bhaktisetu —
> astrologer consultation platform, USD rails for NRI clients"* and the body carried
> the bullet *"Stripe USD rails live for NRI clients (US/UK/CA/AU paying $80-$200 per
> session)"*. Both are removed. **Stripe was removed from the codebase on 2026-08-11**
> (`apps/api/src/lib/env.ts:45-46`, `services/payment.service.ts:2506-2517`); Razorpay
> is the only live rail and it settles INR only — `apps/api/src/routes/bookings.ts:2283`
> is an unconditional `const currency = 'INR'`. No replacement international processor
> has been chosen, so there is no USD corridor, no US/UK/CA/AU client flow, and the
> `$80-$200 per session` figure was never charged by anything. This is a **recruitment
> email to a named human**: the removed lines were an earnings promise, and an
> astrologer who joins on the strength of "USD rails live" and then finds no
> international clients has been misled about their income, not about a feature. Do
> not restore either line until an international rail is live and its real session
> price band is known; the tone note above no longer says "NRI revenue framing" for the
> same reason.
>
> **This fix does not stop the sends.** `apps/api/scripts/ops/cs005-resend-stale-leads.ts`
> holds its own inline copy of this template and is what actually emails leads — the
> same two strings are live at that file's **lines 191 and 269** and are outside this
> document's remit. Correct them there before the next run, per the "Tracked in script"
> note at the bottom of this file.

## Subject

`Bhaktisetu — astrologer consultation platform, {city} pilot`

## Body (~150 words)

```
Namaste {name} ji,

Maine aapko {weeks_ago} weeks pehle email bheji thi Bhaktisetu astrologer
consultation platform ke baare mein. DNS issue tha humare side, theek hua
aaj — re-sending.

Quick update (Q1 launch milestones):
- INR Razorpay rails active for domestic clients
- Bhaktisetu commission 20-30%; astrologer keeps 70-80%
- Verified Jyotish profile shown on darshya.online/astrology
- Video proof (Jitsi recording) auto-saved per session

{city} ke astrologers ko onboard kar rahe hain pilot batch mein. 15-min
call for fit-check?
calendar: https://cal.com/bhaktisetu

Reply "unsubscribe" if not interested.

Namaste,
Bhaktisetu Foundation Team
```

## Structure check

1. ✅ Acknowledge prior outreach + DNS transparency
2. ✅ New update / Q1 launch milestones (domestic Razorpay rail + commission rate)
3. ✅ Soft re-ask (calendar link, fit-check framing)
4. ✅ Explicit unsubscribe

## Personalisation slots

- `{name}` — lead.name
- `{city}` — lead.city
- `{weeks_ago}` — derive from lastContactedAt

## Tracked in script

`apps/api/scripts/ops/cs005-resend-stale-leads.ts` renderTemplate('astrologer').
