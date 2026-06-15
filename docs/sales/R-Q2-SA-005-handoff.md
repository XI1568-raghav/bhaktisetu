# R-Q2-SA-005 Handoff — Pre-seed term sheet (1 lead committed by end Q2)

> **Roadmap item**: R-Q2-SA-005 (P2) · **Founder-action required** · **Status**: in_progress
> **Authored**: 2026-06-15 (round 4)
> **Related spec**: [pre-seed-term-sheet-q2-spec.md](./pre-seed-term-sheet-q2-spec.md)

## Why this is a handoff doc, not a shipped item

KPI = `term_sheets_received` target=1. This requires:

1. Founder runs angel/VC meetings (R-Q2-SA-003 dependency)
2. Live investor conversation w/ term-sheet negotiation
3. External counter-party (lead investor) signs

No agent can self-claim this as shipped without fabricating an investor commitment.
Therefore: scaffold tracking + checklists, founder updates KPI when real term sheet lands.

## Scope of this scaffold

- Term-sheet status tracker template (founder fills weekly)
- Lead-investor pipeline w/ {{token}} placeholders (no fabricated names)
- Term-sheet checklist tied to existing spec sections
- KPI update protocol once term sheet received

## Lead-investor pipeline tracker

Founder updates after each meeting. Do NOT fabricate names — use `[VERIFY-FOUNDER]` until real names confirmed by founder.

| # | Lead candidate | Source | Stage | Check size (₹) | Last touch | Next action | Notes |
|---|---|---|---|---|---|---|---|
| 1 | [VERIFY-FOUNDER] | S-003 angel meetings | Discovery / Deep-dive / Term-sheet drafted / Signed | TBD | TBD | TBD | — |
| 2 | [VERIFY-FOUNDER] | Accelerator (Antler/Surge) | TBD | TBD | TBD | TBD | F-004 application status |
| 3 | [VERIFY-FOUNDER] | Strategic angel | TBD | TBD | TBD | TBD | Cold outreach |

**Pipeline target**: ≥3 active conversations by end month 5; ≥1 term-sheet draft by mid-month 6.

## Term-sheet checklist (verify before signing)

Per [pre-seed-term-sheet-q2-spec.md §Standard term sheet items](./pre-seed-term-sheet-q2-spec.md):

- [ ] Raise size confirmed (₹2-3 Cr range)
- [ ] Pre-money / post-money valuation locked
- [ ] Equity dilution % (target 15-20%)
- [ ] Pro-rata rights (1x+ for lead)
- [ ] Board seat allocation (lead 1 + founder 1)
- [ ] Founder vesting (4-year w/ 1-year cliff)
- [ ] Anti-dilution clause (weighted average preferred)
- [ ] Liquidation preference (1x non-participating preferred)
- [ ] Right of first refusal on next round
- [ ] Drag-along + tag-along rights
- [ ] Use-of-funds breakdown (60/30/10 split)
- [ ] Founder loan repayment treatment (R-Q2-F-005 ₹50K)
- [ ] Lawyer review complete (Indian law: Companies Act 2013 + FEMA if NRI angel)
- [ ] FEMA compliance check IF foreign investor (RBI Master Direction FEMA 20(R) for angel routing)
- [ ] TDS implications confirmed (no §194-O issue at fundraise stage; applies post-revenue)

## KPI update protocol

When founder receives signed term sheet:

1. Update `kpi.current` from 0 → 1 in `docs/roadmap/items/Q2/sales/005-pre-seed-term-sheet-1-lead-committed-by-end-q2.md`
2. Set `status: shipped`
3. Set `shipped_at: YYYY-MM-DDTHH:mm:ss.sssZ`
4. Add `verified_at: <same>` with founder initial in handoff_notes
5. Append lead name + check size to handoff_notes (NOT public roadmap)
6. Open follow-on items: R-Q2-SA-006 (close round) if defined

## Risk + mitigations (carry from spec)

- **Risk**: No lead by Q2-end → continue Q3 (pre-seed cycle 6-12 months industry norm)
- **Mitigation**: R-Q2-F-005 ₹50K founder loan extends runway 6+ months — fundraising can slip a quarter without going lights-out
- **Risk**: Lead drops at term-sheet stage → keep 2nd-priority warm
- **Risk**: Valuation pushback — be ready w/ comp table (pre-revenue devotional / consumer-app pre-seed comps from India 2025-2026)

## What this scaffold does NOT do

- Does not list real investor names (founder confidentiality)
- Does not auto-pull pipeline from CRM (no CRM integration; manual tracker)
- Does not auto-update KPI (founder manual update on signed term sheet)
- Does not draft term-sheet text (legal counsel required, not agent-safe)

## References

- Spec: [pre-seed-term-sheet-q2-spec.md](./pre-seed-term-sheet-q2-spec.md)
- Dependent: R-Q2-SA-003 (3 angel investor meetings) — [3-angel-investor-meetings-q2-spec.md](./3-angel-investor-meetings-q2-spec.md)
- Dependent: R-Q2-F-004 (accelerator applications)
- Bridge runway: R-Q2-F-005 (founder loan ₹50K)
