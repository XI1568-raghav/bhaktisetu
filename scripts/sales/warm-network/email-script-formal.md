<!-- TC-01 / TC-08 (trust audit): the 80G deduction promise and the "verified
pandit" adjective were removed from this template. Darshya holds no Section 80G
registration (apps/web/lib/company.ts HAS_80G_VERIFIED is false, pan and
eightyGNumber null) and apps/api/src/lib/pdf-receipt.ts is80GEligible() needs a
donee 80G number AND PAN read from gaushala_profiles columns no route writes; and
nothing promotes a Priest to verified outside apps/api/prisma/seed.ts. This file
is plain markdown a human copies into a real message, so there is nothing to gate
it on: restore the wording by hand the day apps/api/src/lib/eighty-g.ts HAS_80G
and apps/api/src/lib/pandit-vetting.ts HAS_PANDIT_VETTING are both true. -->

# Email script — Formal / older contacts

> For older / formal contacts where WA feels too casual: family elders, ex-managers, board-level connections, formal LinkedIn 1st-degree.
> Subject line is short + non-salesy. Body opens with personal hook, single ask, low-friction next step.
> Log `channel: email` + `script_variant: email-formal` in tracker.

## Subject

Bhaktisetu — quick intro ask

## Hindi

Namaste {first_name} ji,

Aapko yaad hoga, main Rahul. Bhaktisetu naam ki ek platform bana raha hoon jo NRI families ko verified temples, pandits aur gaushalas se jodti hai — online pujas, har puja ka video proof, aur numbered donation receipts (proof of payment, tax-exemption certificate nahi).

Currently supply side build kar raha hoon. Aap kisi temple trustee, senior pandit, ya gaushala manager ko jaante hain jinka intro ho sakta hai? Bas naam + number bhejna kaafi hai, baat main karunga.

Aapka samay anmol hai. Dhanyavad.

Rahul

## English

Namaste {first_name} ji,

You may remember me — Rahul. I'm building Bhaktisetu, a platform connecting NRI families to verified temples, pandits, and gaushalas in India — online pujas, video proof of every puja, and numbered donation receipts (proof of payment, not tax-exemption certificates).

I'm focused on building the supply side. Do you know any temple trustee, senior pandit, or gaushala manager you could introduce me to? Just a name + number is enough — I'll handle the conversation.

Grateful for your time.

Rahul

## Notes

- Replace `{first_name}` + founder signature.
- Use this when WA feels too informal for the relationship.
- One-shot. No follow-up on email (formal contacts don't appreciate chase).
