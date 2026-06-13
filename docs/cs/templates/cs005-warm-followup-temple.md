# CS-005 Warm-Followup Template — Temple TP/Trustee

> **Role**: TEMPLE_MANAGER · **Item**: R-Q1-CS-005 · **Use after**: IT-004 Resend DNS verify GREEN · **Tone**: respectful Hindi, formal, pilot framing

## Subject

`Bhaktisetu — {city} temple listing pilot, 60-80% commission, no upfront fee`

## Body (~150 words)

```
Pranam {name} ji,

Bhaktisetu Foundation se hello. Aapko {weeks_ago} weeks pehle email bheji
thi. Possible hai spam folder mein chali gayi — humara DNS setup theek hua
hai aaj.

Updated context:
- Bhaktisetu Foundation: active 80G + CSR-1 in India
- 30 {city} temples in pipeline; 5 pilots will be live by Q2-end
- Devotees pay via Razorpay/Stripe; temple ko 60-80% commission
- Video proof mandatory per puja (mandate per business rule #1)
- Founder personally onboards first 5 temples (no contractor handoff)

Agar {temple_name} ko pilot karna chahein — 15-min exploratory call?
calendar: https://cal.com/bhaktisetu

Nahi interested → "remove" likh dein reply mein, main hata dunga.

Pranam,
Bhaktisetu Foundation Team
```

## Structure check

1. ✅ Acknowledge prior outreach + explain DNS issue (transparency, builds trust w/ temple trustees)
2. ✅ New update / Q1 milestones (80G/CSR-1 + pipeline + commission)
3. ✅ Soft re-ask (calendar link, exploratory framing)
4. ✅ Explicit unsubscribe ("remove" keyword)

## Personalisation slots

- `{name}` — lead.name (TP/trustee personal name)
- `{city}` — lead.city
- `{temple_name}` — lead.metadata.temple_name (fallback: "aapke temple")
- `{weeks_ago}` — derive from lastContactedAt

## Tracked in script

`apps/api/scripts/ops/cs005-resend-stale-leads.ts` renderTemplate('temple').
