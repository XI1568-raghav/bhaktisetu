# Acceptance Harness — R-Q1-S-010

How to verify the artifact bundle is intact + ready for founder execution.

## Automated test

```bash
pnpm vitest run tests/sales/wellness-instructors-artifacts.test.ts
```

Asserts:

- All 9 required files exist in `docs/sales/wellness-instructors/`
- `target-list.csv` has ≥15 rows + 11 RFC-4180 columns in correct order
- Every `discipline` cell ∈ allowed enum (8 values)
- ≥3 Ayurveda + ≥8 yoga rows (vertical balance)
- `crm-tracking.csv` has correct 8 columns + all rows status=`lead`
- `vetting-rubric.md` declares 6 gates (matched by `^## Gate \d` regex)
- `intake-form-spec.md` declares all 12 required schema fields

## Manual founder review

1. Read `vetting-rubric.md` — confirm 6 gates make sense for current legal posture.
2. Read both outreach templates — adjust founder voice/tone where it sounds robotic.
3. Open `target-list.csv` in spreadsheet — sanity-check 15 candidates look real (cross-check 2-3 IG handles).
4. Confirm CRM tracking CSV is the source-of-truth schema; later port to Notion/Airtable/Linear if needed.

## Operational success criteria

- 15 targets balanced 10 yoga / 5 Ayurveda ✓
- 6-gate vetting rubric ✓
- Email + IG DM templates ✓
- Intake spec ≥10 fields (this ships 12) ✓
- Schema test green ✓

## Out of scope (verified)

No live outreach by agent. No final legal MOU (draft only, flagged for review). No booking UI. No payment splits implementation. No non-yoga/Ayurveda wellness verticals (no astrology, no kirtan — those are separate roadmap items).

## Next step (post-acceptance)

Founder picks up `crm-tracking.csv` + the two outreach templates and begins live outreach Day 1. Target: first instructor responses within 7 days, first approved instructor by week 6, all 5 live by month 3.
