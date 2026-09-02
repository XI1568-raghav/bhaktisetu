# CS-005 Warm-Followup Template — Temple TP/Trustee

> **Role**: TEMPLE_MANAGER · **Item**: R-Q1-CS-005 · **Use after**: IT-004 Resend DNS verify GREEN · **Tone**: respectful Hindi, formal, pilot framing

> **Correction 2026-09-02 (`OPS-10`).** The commission bullet used to read *"Devotees
> pay via Razorpay/Stripe; temple ko 60-80% commission"*. **Stripe was removed from the
> codebase on 2026-08-11** (`apps/api/src/lib/env.ts:45-46`,
> `services/payment.service.ts:2506-2517`); Razorpay is the only live rail and it
> settles INR only (`apps/api/src/routes/bookings.ts:2283`, an unconditional
> `const currency = 'INR'`). No replacement international processor has been chosen, so
> only the Razorpay half of that sentence is true and the Stripe half is struck. The
> commission figure is untouched — it was not part of the false claim. This letter goes
> to a **trustee deciding whether to hand us a temple's donation flow**, and it already
> makes a point of stating the 80G position honestly; naming a processor we do not use
> undercuts exactly that.
>
> **This fix does not stop the sends.** `apps/api/scripts/ops/cs005-resend-stale-leads.ts`
> holds its own inline copy and is what actually emails leads — the same string is live
> at that file's **line 229** and is outside this document's remit. Correct it there
> before the next run, per the "Tracked in script" note at the bottom of this file.

## Subject

`Bhaktisetu — {city} temple listing pilot, 60-80% commission, no upfront fee`

## Body (~150 words)

```
Pranam {name} ji,

Bhaktisetu Foundation se hello. Aapko {weeks_ago} weeks pehle email bheji
thi. Possible hai spam folder mein chali gayi — humara DNS setup theek hua
hai aaj.

Updated context:
- Bhaktisetu Foundation abhi 80G ya CSR-1 registered nahi hai — donation
  receipt proof of payment hai, tax-exemption certificate nahi
- 30 {city} temples in pipeline; 5 pilots will be live by Q2-end
- Devotees pay via Razorpay; temple ko 60-80% commission
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
2. ✅ New update / Q1 milestones (registration status stated honestly + pipeline + commission)
3. ✅ Soft re-ask (calendar link, exploratory framing)
4. ✅ Explicit unsubscribe ("remove" keyword)

## Personalisation slots

- `{name}` — lead.name (TP/trustee personal name)
- `{city}` — lead.city
- `{temple_name}` — lead.metadata.temple_name (fallback: "aapke temple")
- `{weeks_ago}` — derive from lastContactedAt

## Tracked in script

`apps/api/scripts/ops/cs005-resend-stale-leads.ts` renderTemplate('temple').
