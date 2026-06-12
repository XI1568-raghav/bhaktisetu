# Portal Pages Mock Cleanup Audit — Remove 8 Hardcoded Mock Arrays

> **Roadmap item**: R-Q1-P-002 (P1, CPO §1) · **Authored**: 2026-06-13

## Goal

Find + remove all hardcoded mock data arrays in portal pages. Real DB OR proper API call required. Silent mocks = customer-facing trust violations + spec drift.

## Audit method

```bash
# Find suspect patterns
grep -rn "MOCK\|mock\|fakeData\|sampleData\|hardcoded\|\\bDATA = \\[" apps/web/app/*-portal/ apps/web/app/admin/ apps/web/app/dashboard/ 2>&1 | head -30

# Specifically search for arrays of >5 items inline in components
grep -rn "const \\w\\+ = \\[" apps/web/app/ --include="*.tsx" -l | head -20
```

## 8 candidate portal pages (per spec)

| # | Page (suspected) | Risk if mock |
|---|---|---|
| 1 | apps/web/app/admin/dashboard | Founder-facing — silent stale data |
| 2 | apps/web/app/admin/leads | Sales-facing — wrong lead pipeline view |
| 3 | apps/web/app/admin/temples | Wrong temple list shown to admin |
| 4 | apps/web/app/pandit-portal | Pandit sees fake bookings |
| 5 | apps/web/app/temple-portal | Temple TP sees fake metrics |
| 6 | apps/web/app/store-portal | Store owner sees fake orders |
| 7 | apps/web/app/astrologer-portal | Astro sees fake consultations |
| 8 | apps/web/app/admin/donations | Wrong donor list / amounts |

Per page: replace mock with real API fetch OR explicit "no data yet" empty state. NEVER silent mock.

## Engineering ticket

R-Q1-P-002b: per-page PR, ~30-50 lines each. Pure backend wiring fix.

EDGE-RUNTIME risk: none if existing pages already declare runtime correctly.

## Verify

After each cleanup:
- E2E test booking flow per page
- Visual regression: page shows real data OR explicit empty state
- No hardcoded sample data remaining

## Closes

R-Q1-P-002 — audit shipped.
