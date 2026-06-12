# Strip Fabricated "Pvt. Ltd." from refunds/page.tsx — Quick Legal Fix

> **Roadmap item**: R-Q1-L-001 (P1) · **Authored**: 2026-06-13 · **Time**: 15 min · **Owner**: founder (engineering ticket)

## Goal

Per F-001 decision (KEEP Section 8 Foundation, no Pvt. Ltd. incorporation), audit + remove any "Pvt. Ltd." or "Bhaktisetu Pvt. Ltd." misnaming on customer-facing pages. Especially `refunds/page.tsx`.

## Audit + fix

```bash
# Find misnomers
grep -rn "Pvt\.\?\s*Ltd\.\?\|Private Limited" apps/web/app/ apps/web/components/ apps/web/lib/

# Common location per spec: refunds/page.tsx
```

Replace with:
- "Bhaktisetu Foundation" (Section 8 not-for-profit)
- "Foundation" in casual reference
- Never "Pvt. Ltd." OR "Private Limited" anywhere

## Verify

```bash
# Re-run grep after fix
grep -rn "Pvt\.\?\s*Ltd\.\?\|Private Limited" apps/web/

# Should return: ZERO matches (or only counsel-approved references)
```

## Engineering ticket

R-Q1-L-001b: Search + replace across apps/web. Single PR, no edge-runtime trigger. ~30 lines changed.

## Closes

R-Q1-L-001 — runbook shipped.
