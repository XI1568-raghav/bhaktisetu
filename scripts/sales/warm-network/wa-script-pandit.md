<!-- TC-01 / TC-08 (trust audit): the 80G deduction promise and the "verified
pandit" adjective were removed from this template. Darshya holds no Section 80G
registration (apps/web/lib/company.ts HAS_80G_VERIFIED is false, pan and
eightyGNumber null) and apps/api/src/lib/pdf-receipt.ts is80GEligible() needs a
donee 80G number AND PAN read from gaushala_profiles columns no route writes; and
nothing promotes a Priest to verified outside apps/api/prisma/seed.ts. This file
is plain markdown a human copies into a real message, so there is nothing to gate
it on: restore the wording by hand the day apps/api/src/lib/eighty-g.ts HAS_80G
and apps/api/src/lib/pandit-vetting.ts HAS_PANDIT_VETTING are both true. -->

# WA script — Pandit introducer ask

> Personal WA send. Founder-voice only. No marketing fluff. No links unless asked.
> Pick Hindi or English based on contact comfort. Log `script_variant: pandit` + chosen `language` in tracker.

## Hindi

Namaste {first_name} ji, Rahul yahaan. Bhaktisetu pe NRI families ko pandits se jodta hoon — pujas online + har puja ka video proof. 1-2 honest pujari jaante ho jo extra ₹20-40k/month karna chaahein? Wedding pandit, gotra pandit, koi bhi. Bas naam + number. 🙏

## English

Namaste {first_name} ji, Rahul here. On Bhaktisetu I connect NRI families to pandits — online pujas with video proof of every puja. Know 1-2 honest pujaris who'd want extra ₹20-40k/month? Wedding pandit, gotra pandit, anyone. Just name + number is plenty. 🙏

## Notes

- Replace `{first_name}` per contact. Keep founder name. Vary nothing else.
- Pandit ask works best with family-priest / gotra-pandit context — name the relationship if known.
- If silent after 7 days: send `followup-script-day7.md` once. After that, drop.
