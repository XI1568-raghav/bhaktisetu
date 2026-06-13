# Refund Policy v2 — DRAFT (alias)

> R-Q1-L-002 canonical draft lives in companion files (split for translation workflow + lawyer-brief packaging). This alias preserves the spec-mandated filename so future cycles + the lawyer brief reference resolve cleanly.

## Canonical files

| File | Purpose |
|---|---|
| `refund-policy-v2-english.md` | Full English v2 draft, 17 clauses, all 12 stress-test scenarios |
| `refund-policy-v2-hindi.md` | Hindi mirror (summary side-by-side per CPA 2019 regional-language compliance; founder native-speaker review pending) |
| `refund-policy-gap-analysis.md` | Gap Matrix vs Current Policy (12 scenarios × Current/Gap/Risk/Source-of-Law) |
| `refund-policy-v2-lawyer-brief.md` | 1-page handoff for Bengaluru counsel (≤700 words, 5 questions) |
| `refund-policy-v2-CHECKLIST.md` | Acceptance checklist (15+ items, lawyer-confirm + founder-fill tag inventory) |
| `refund-policy-v2-FINAL.md` | Reserved — lawyer-redlined version lands here after counsel sign-off |

## Gap Matrix (summary)

See `refund-policy-gap-analysis.md` for full table with Consumer Protection Act 2019 / E-Commerce Rules 2020 / RBI chargeback citations and `[LAWYER-CONFIRM]` tags where source-of-law is unsettled.

## Proposed treatment summary (12 scenarios)

| # | Scenario | Treatment |
|---|---|---|
| 1 | Pandit no-show | 100% refund + 10% platform credit (12-month, non-transferable) |
| 2 | Video proof missing >72h | Auto-refund 100% via cron `apps/api/src/jobs/booking-quality-monitor.ts` |
| 3 | Wrong puja performed | 100% refund + free makegood booking |
| 4 | Cancel <24h | 0% refund (priest + materials committed; <6h in draft) |
| 5 | Cancel 24–72h | 50% refund |
| 6 | Cancel >72h | 100% refund (draft does not deduct processing fee; lawyer-confirm) |
| 7 | Payment failed + bank debited | Razorpay T+10 auto-reconciliation; manual 100% if unresolved |
| 8 | NRI Stripe chargeback | Proof-of-delivery package within Stripe 7-day window |
| 9 | Force majeure | Reschedule first; 100% refund within 14 business days if declined |
| 10 | Astrology consult dissatisfaction | NO REFUND — pre-purchase disclaimer mandatory in `apps/api/src/routes/consultation.ts` booking flow |
| 11 | Subscription cancel mid-cycle | Pro-rata refund unused days; no refund if >50% consumed |
| 12 | 80G refund post-receipt | Allowed; devotee returns Form 10BE; we file revised 10BD; ₹500 CA fee deducted |

## Status

DRAFT — pending Bengaluru counsel review. NO prod code changes this cycle.
`apps/web/app/refunds/page.tsx` (v1) remains live until lawyer-redlined v2 is applied via separate PR.

See `refund-policy-v2-CHECKLIST.md` for acceptance criteria + open `[LAWYER-CONFIRM]` / `[FOUNDER-FILL]` tags.
