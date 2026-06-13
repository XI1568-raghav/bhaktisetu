# Canada pandit outreach kit — founder runbook

> R-Q3-S-007 cycle slice — research + outreach infra, 10 emails queued.
> Actual 10-onboard target is multi-week founder follow-up outside cycle.

## What this ships

- `outreach-email-en.md` — English email template (CASL-compliant footer)
- `outreach-email-hi.md` — Hindi (Devanagari + Romanized) template
- `outreach-whatsapp.md` — short WA opener (< 400 chars)
- `followup-day5.md` — 5-day follow-up template
- `kyc-checklist-canada.md` — Canadian-context KYC (PR card + VSC + no SIN)
- `../../../data/leads/canada-pandits-2026-06.csv` — 50+ lead seed list
- `../../../apps/api/scripts/leads/canada-pandit-prospector.mjs` — runner
- `../../../docs/agent-reports/2026-06-12-canada-pandit-outreach.md` — methodology
- `../../../apps/api/scripts/leads/_canada-cities.ts` — city tier config

## Pre-flight — founder checklist

1. **Mailing address.** CASL mandates a Canadian postal address in every email
   footer. Founder must acquire either a PO Box or registered-agent address
   before any email actually sends. Templates currently say `[address TBD]`.
2. **Vulnerable Sector Check policy.** Decide before onboarding whether VSC is
   mandatory for all pandits or only child-adjacent puja SKUs. See kyc doc #5.
3. **Stripe CAD rail.** R-Q2-G-007 prerequisite. Outreach uses "early-access"
   framing so we can send before the rail is live, but actual onboarding waits.

## Pace plan — 10 sends queued this cycle

- Rows 1-10 of CSV marked `outreach_status=queued`.
- Suggested cadence: 3 sends / day across 4 days = 12 contacts, room for 2 swaps.
- Personalise temple_name, city, first_name, founder_name in EVERY send.
- Track `first_contact_at` per row after send.

## Dry-run prospector

```bash
node apps/api/scripts/leads/canada-pandit-prospector.mjs --dry --limit 5
```

Emits stub rows to `data/leads/canada-pandits-2026-06.csv` if not present.
In real mode, leaves the curated CSV untouched (preserves founder edits).

## Tests

```bash
pnpm --filter @poojly/api test canada
```

Expect 4 test files green: canada-cities + prospector + templates + csv-output.

## Out-of-cycle / multi-week

- Send + personalise 10 emails (founder voice)
- Reply triage; book intro calls; KYC requests
- After CAD rail (R-Q2-G-007) live, re-run prospector + send batch 2
- Track KPI via roadmap item Supabase query
