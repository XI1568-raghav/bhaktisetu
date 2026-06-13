# CS-005 Warm-Followup Template — Gaushala Manager

> **Role**: GAUSHALA_MANAGER · **Item**: R-Q1-CS-005 · **Use after**: IT-004 Resend DNS verify GREEN · **Tone**: respectful Hindi, mission-aligned, recurring-donation framing

## Subject

`Bhaktisetu — gauseva recurring-donation platform, {city} pilot`

## Body (~150 words)

```
Pranam {name} ji,

Bhaktisetu Foundation se. Kuch hafte pehle email bheji thi gauseva
recurring-donation platform ke baare mein. Spam ya delivery issue ho sakta
tha — humara DNS theek hua hai aaj.

Re-sending humari original ask:

Bhaktisetu pe gauseva recurring-donation platform launch ho raha hai. NRI +
India donors monthly contribute karte hain (₹500-₹10,000/mo), aur gaushala
ko monthly disbursement milta hai with 80G receipt for donor.

{city} ki gaushala ko list karna chahte hain pilot batch mein. Aapke
gaushala ka basic info + 80G regn + PAN bhejein, hum 7 din mein onboard kar
denge — koi upfront fee nahi.

15-min call ke liye reply karein OR "remove" likhein agar interested nahi.

Pranam,
Bhaktisetu Foundation Team
```

## Structure check

1. ✅ Acknowledge prior outreach + DNS issue
2. ✅ New update / recurring-donation platform launch (specific Q1 milestone)
3. ✅ Soft re-ask (basic info bhejein + 7-day onboard SLA)
4. ✅ Explicit unsubscribe ("remove" keyword)

## Personalisation slots

- `{name}` — lead.name (gaushala manager personal name)
- `{city}` — lead.city
- `{weeks_ago}` — derive from lastContactedAt

## Tracked in script

`apps/api/scripts/ops/cs005-resend-stale-leads.ts` renderTemplate('gaushala').
