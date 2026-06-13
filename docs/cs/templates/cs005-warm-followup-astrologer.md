# CS-005 Warm-Followup Template — Astrologer

> **Role**: ASTROLOGER · **Item**: R-Q1-CS-005 · **Use after**: IT-004 Resend DNS verify GREEN · **Tone**: respectful Hindi/Sanskrit-tinged, NRI revenue framing

## Subject

`Bhaktisetu — astrologer consultation platform, USD rails for NRI clients`

## Body (~150 words)

```
Namaste {name} ji,

Maine aapko {weeks_ago} weeks pehle email bheji thi Bhaktisetu astrologer
consultation platform ke baare mein. DNS issue tha humare side, theek hua
aaj — re-sending.

Quick update (Q1 launch milestones):
- Stripe USD rails live for NRI clients (US/UK/CA/AU paying $80-$200 per session)
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
2. ✅ New update / Q1 launch milestones (USD rails + commission rate)
3. ✅ Soft re-ask (calendar link, fit-check framing)
4. ✅ Explicit unsubscribe

## Personalisation slots

- `{name}` — lead.name
- `{city}` — lead.city
- `{weeks_ago}` — derive from lastContactedAt

## Tracked in script

`apps/api/scripts/ops/cs005-resend-stale-leads.ts` renderTemplate('astrologer').
