<!-- TC-08 (P1, trust audit): the "verified pandit" adjective was removed from the
copy below. Nothing in the codebase promotes a Priest to verified: the only
production writer of Priest.verificationStatus is apps/api/src/routes/priest.ts,
which writes 'pending'; isVerified: true appears only in apps/api/prisma/seed.ts
and apps/api/scripts/seed-demo-users.ts. There is no credential upload, no
reference workflow, no probation review and no per-pandit trust score column, and
Priest.aadhaarVerified is read as a PAYOUT gate (apps/api/src/routes/providers.ts),
not as a published credential. This is markdown a human copies into a real
message, so there is nothing to gate it on: restore the wording by hand the day
apps/api/src/lib/pandit-vetting.ts HAS_PANDIT_VETTING is true. -->

# CS-005 Warm-Followup Template — Pandit

> **Role**: PANDIT · **Item**: R-Q1-CS-005 · **Use after**: IT-004 Resend DNS verify GREEN · **Tone**: respectful Hindi-English mix, founder-personal, soft re-ask

> **Correction 2026-09-02 (`OPS-10`).** The milestones list used to carry the bullet
> *"NRI USD consultations going live with Stripe rails"*. It is removed. **Stripe was
> removed from the codebase on 2026-08-11** (`apps/api/src/lib/env.ts:45-46`,
> `services/payment.service.ts:2506-2517`); Razorpay is the only live rail and it
> settles INR only — `apps/api/src/routes/bookings.ts:2283` is an unconditional
> `const currency = 'INR'`. No replacement international processor has been chosen, so
> nothing is "going live" on a rail that does not exist. This is a **recruitment email
> to a named pandit**, and NRI demand is the reason a pandit would say yes; promising
> it on a rail we do not run is an earnings claim we cannot honour. Restore the bullet
> only when an international rail is actually live.
>
> **This fix does not stop the sends.** `apps/api/scripts/ops/cs005-resend-stale-leads.ts`
> holds its own inline copy and is what actually emails leads — the same string is live
> at that file's **line 207** and is outside this document's remit. Correct it there
> before the next run, per the "Tracked in script" note at the bottom of this file.

## Subject

`Bhaktisetu — {city} pandit network update + ek aur ask`

## Body (~150 words)

```
Pranam {name} ji,

Maine aapko {weeks_ago} weeks pehle Bhaktisetu Foundation (https://darshya.online)
ke baare mein email bheja tha — pandit platform jo NRI devotees ke
saath India temples + pandit ji ko connect karta hai.

Possible hai woh email aap tak nahi pahuncha — humare DNS setup ka ek issue
tha. Aaj theek hai.

Update humari taraf se (last {weeks_ago} weeks):
- 30 pandit prospects shortlisted across Bengaluru
- First 5 pilot pandits onboarded in BLR
- 70-80% commission to pandit, no upfront fee

Agar aap interested hain ek 15-min call ke liye —
calendar: https://cal.com/bhaktisetu

Agar pehle hi koi reply kar chuke hain ya not-interested — bas yahin reply
kar dein "unsubscribe" likh ke, main hata dunga aur dobara contact nahi karunga.

Pranam,
Bhaktisetu Foundation Team
```

## Structure check

1. ✅ Acknowledge prior outreach
2. ✅ New update / Q1 launch milestones
3. ✅ Soft re-ask (single CTA: calendar link)
4. ✅ Explicit unsubscribe instruction

## Personalisation slots

- `{name}` — lead.name (fallback: "Ji")
- `{city}` — lead.city (fallback: "aapke shahar")
- `{weeks_ago}` — derive from lastContactedAt

## Tracked in script

`apps/api/scripts/ops/cs005-resend-stale-leads.ts` renderTemplate('pandit'). Founder edits this .md THEN updates inline template in script.
