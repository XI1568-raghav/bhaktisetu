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
- NRI USD consultations going live with Stripe rails
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
