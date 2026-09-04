<!-- TC-01 / TC-08 (trust audit): the 80G deduction promise and the "verified
pandit" adjective were removed from this template. Darshya holds no Section 80G
registration (apps/web/lib/company.ts HAS_80G_VERIFIED is false, pan and
eightyGNumber null) and apps/api/src/lib/pdf-receipt.ts is80GEligible() needs a
donee 80G number AND PAN read from gaushala_profiles columns no route writes; and
nothing promotes a Priest to verified outside apps/api/prisma/seed.ts. This file
is plain markdown a human copies into a real message, so there is nothing to gate
it on: restore the wording by hand the day apps/api/src/lib/eighty-g.ts HAS_80G
and apps/api/src/lib/pandit-vetting.ts HAS_PANDIT_VETTING are both true. -->

# WA script — Gaushala introducer ask

> Personal WA send. Founder-voice only. No marketing fluff. No links unless asked.
> Pick Hindi or English based on contact comfort. Log `script_variant: gaushala` + chosen `language` in tracker.

## Hindi

Namaste {first_name} bhai, Rahul yahaan. Bhaktisetu pe gaushala donations + cow-seva chala raha hoon NRI donors ke liye. 1-2 honest gaushala manager jaante ho jo partnership chaahein? Numbered donation receipt (proof of payment, tax-exemption certificate nahi) + monthly seva income. Bas naam + number. 🙏

## English

Namaste {first_name} bhai, Rahul here. On Bhaktisetu I run gaushala donations + cow-seva for NRI donors. Know 1-2 honest gaushala managers who'd want a partnership? Numbered donation receipts (proof of payment, not tax-exemption certificates) + monthly seva income. Just name + number is plenty. 🙏

## Notes

- Replace `{first_name}` per contact. Keep founder name. Vary nothing else.
- Rural/Marwari/agri contacts are highest-yield for this ask.
- If silent after 7 days: send `followup-script-day7.md` once. After that, drop.
