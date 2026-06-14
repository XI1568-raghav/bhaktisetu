# R-Q1-F-002 — Business Bank Account + Book-keeping Handoff

**Status**: founder-action-required
**Runbook**: `docs/finance/business-bank-account-setup-runbook.md`
**Template**: `docs/finance/foundation-books-FY26-27-template.csv`
**Depends on**: R-Q1-F-001 (incorp decision — founder must pick entity before opening account)

## Why this is open

KPI `business_bank_open` requires a real ICICI/HDFC/Axis Foundation current account. Agent cannot:

- Visit a bank branch
- Submit Foundation CIN + 80G + MoA/AoA + board resolution
- Sign account-opening forms
- Switch Razorpay/Stripe settlement bank in those dashboards

Agent has shipped everything that can be shipped without founder presence:

- Setup runbook (bank choice rationale, document checklist, 5-step flow, 7-10 day timeline)
- 4-sheet book-keeping template (cash flow / revenue per lane / expenses / donor list for Form 10BD)
- Monthly reconciliation cadence (last Friday + founder + CA)

## Founder action (sequential)

1. **Close R-Q1-F-001 first** — bank account is opened in the chosen entity name. If Section 8 Foundation: open Foundation current account. If Pvt Ltd subsidiary scoped: open both Foundation + Pvt Ltd current accounts (separate books, separate reconciliation).
2. **Pick bank**: ICICI vs HDFC vs Axis. Recommendation: ICICI (proven Razorpay+Stripe flow, lowest minimum balance for Section 8, online net-banking strongest).
3. **Gather docs** per runbook §"Required documents". MoA/AoA + board resolution likely already on file from incorp.
4. **Schedule branch visit** — 1 day founder time, expect 7-10 day total processing.
5. **Open Google Sheets** from `docs/finance/foundation-books-FY26-27-template.csv` (import as Google Sheet, save to private drive `finance/foundation-books-FY26-27.gsheet`).
6. **After account active**:
   - Update Razorpay dashboard settlement bank (~3 day Razorpay-side processing)
   - Update Stripe dashboard settlement bank (~5-7 day Stripe-side processing)
   - First test settlement: ₹100 puja booking → verify settles into Foundation account, not founder personal
7. **Schedule monthly reconciliation** — recurring last Friday calendar invite, founder + CA, 90 min.

## After bank active

1. Set `business_bank_open: 1` in `docs/roadmap/_manual-kpis.yml`
2. Flip frontmatter `status: shipped` + add `shipped_at: <ISO>` to `docs/roadmap/items/Q1/finance/002-open-separate-business-bank-account-book-keeping-s.md`
3. Document account number + IFSC in `docs/legal/foundation-registration-numbers.md` (founder-only SoT, never commit to repo)
4. Verify first month reconciliation closes clean → KPI promotes from `business_bank_open` to recurring `monthly_reconciliation_clean`

## Open questions

1. Single Foundation account OR Foundation + Pvt Ltd dual-account (depends on R-Q1-F-001 outcome)
2. Founder personal account hand-over: how many months of personal-account settlement to retain before switching (recommend 1 month overlap for clean cut-off)
3. CA selected (per R-Q1-F-003 / R-Q4-F-003 — verify CA can handle Foundation 12A/80G + Pvt Ltd GST + monthly reconciliation in single engagement)

## Closes

R-Q1-F-002 (agent portion). Founder action closes item end-to-end. Estimated founder time: 4 hr active + 7-10 day bank processing.
