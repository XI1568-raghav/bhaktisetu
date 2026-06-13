# Refund Policy v2 — Acceptance Checklist

> Per R-Q1-L-002. Written FIRST (TDD spirit for pure-drafting cycle). Each item becomes acceptance criteria for the Bengaluru counsel's redlines.

Status legend: `[x]` met by current draft / `[ ]` open / `[L]` LAWYER-CONFIRM / `[F]` FOUNDER-FILL.

## Coverage of 12 stress-test scenarios

- [x] 1. Pandit no-show — covered in `refund-policy-v2-english.md` §3 ("Puja not performed by temple")
- [x] 2. Video proof missing >72h post-puja — covered §3 ("Video proof not delivered within 48h") — TIGHTER than spec default (48h vs 72h)
- [x] 3. Wrong puja performed — covered §3 NEW row ("quality dispute, wrong puja")
- [x] 4. Devotee cancels <24h before muhurat — covered §3 cancellation matrix (<6h = 0% per stricter draft; 6-24h = 50%)
- [x] 5. Devotee cancels 24-72h before muhurat — covered §3 (>24h = 100%)
- [x] 6. Devotee cancels >72h before muhurat — covered §3 (>24h = 100%; draft does not deduct processing fee)
- [x] 7. Payment failed at gateway but bank debited — covered §8 (Razorpay T+10 reconciliation)
- [x] 8. NRI Stripe chargeback — covered §6 + §9 (proof-of-delivery package)
- [x] 9. Force majeure — covered §2 (14 business days, 100%)
- [x] 10. Astrology consultation dissatisfaction — covered §5 (no-refund, opinion-based; pre-purchase disclaimer required)
- [x] 11. Subscription cancellation mid-cycle — covered §4 NEW (pro-rata refund, >50% consumed = no refund)
- [x] 12. 80G donation refund AFTER tax receipt issued — covered §7 (return Form 10BE; revised 10BD; CA fee deducted)

## Structural / hygiene

- [x] Hindi summary present — `refund-policy-v2-hindi.md` mirrors English structure per CPA 2019 regional-language compliance
- [F] Hindi summary translated by native speaker (not LLM) — agent translation flagged for founder native-speaker review (₹500 / 30 min budget)
- [x] Auto-refund cron job referenced by file path — references `apps/api/src/jobs/booking-quality-monitor.ts` in §3 + lawyer brief Q1
- [x] Bengaluru jurisdiction clause present — covered §10 (dispute resolution, exclusive Bengaluru jurisdiction subject to Arbitration & Conciliation Act 1996)
- [F] Grievance officer placeholder present — `[FOUNDER-FILL]` name/email/address per Consumer Protection Act 2019 §74
- [x] 80G refund mechanism cross-references CA workflow — §7 mentions Form 10BE return + revised 10BD filing + CA ₹500 fee
- [x] NRI chargeback proof-of-delivery list itemized — §6 lists: video URL + devotee acknowledgement + pandit photo + GPS-timestamped puja location
- [x] Astrology no-refund disclaimer cross-references pre-purchase UI — §5 requires checkbox + visible disclaimer in `apps/api/src/routes/consultation.ts` booking flow
- [x] Subscription pro-rata math example included — §4 worked example (₹1200/year, cancel day 100 of 365 → refund ~₹871)
- [x] Force majeure definition does not over-claim — §2 enumerated list, "reasonable control" qualifier
- [x] Effective date + version number present — header `Effective from: [DATE]`, `Last updated: 2026-06-11 (draft)`, version v2
- [x] Changelog from v1 present — see `refund-policy-v2-english.md` §11 Changelog
- [x] Plain-English readability (no clause >40 words) — manual review pass complete; longest clause §10 dispute = 38 words
- [L] All [LAWYER-CONFIRM] tags listed at end of doc — see §12 in english draft
- [F] All [FOUNDER-FILL] tags listed at end of doc — see §12 in english draft

## Tag inventory

### `[LAWYER-CONFIRM]` open items

1. Whether auto-refund-on-video-proof-missing is enforceable as a pre-committed remedy under Consumer Protection (E-Commerce) Rules 2020 Rule 6(5).
2. Whether the NRI proof-of-delivery package satisfies Visa/Mastercard "compelling evidence" AND Indian law.
3. Astrology "opinion-based service" exemption + required disclaimer language.
4. 80G post-receipt refund window + Form 10BE liability.
5. Bengaluru exclusive-jurisdiction enforceability against NRI consumers.

### `[FOUNDER-FILL]` open items

1. Grievance officer name + email + postal address (Consumer Protection Act 2019 §74).
2. Bengaluru counsel name + engagement letter PDF path (`docs/legal/engagements/2026-06-refund-policy-counsel.pdf`).
3. Brief email date to counsel.
4. Hindi native-speaker translation (or sign-off on agent translation).
5. Registered office address + Section 8 / Foundation reg number in §1 scope clause.

## Out-of-scope (must NOT do this cycle)

- Edit live `apps/web/app/refunds/page.tsx` beyond TODO comment.
- Implement auto-refund cron (separate engineering item).
- Translate full policy body to Hindi (only summary table).
- Contact lawyers (founder-only).
- Invent case-law citations.

## Sign-off

- [ ] Founder sign-off on draft + lawyer brief
- [ ] Lawyer engaged (₹15K, Bengaluru) + brief sent
- [ ] Lawyer redlines received
- [ ] Redlines applied to `apps/web/app/refunds/page.tsx` via separate PR
- [ ] KPI `refund_policy_lawyer_reviewed` flipped 0 → 1 (manual KPI yml)
