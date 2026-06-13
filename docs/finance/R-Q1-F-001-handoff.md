# R-Q1-F-001 — Incorp Decision Handoff

**Status**: founder-action-required
**Brief shipped**: `docs/agent-reports/2026-06-13-incorp-decision-brief.md`
**Prior long-form**: `docs/finance/incorporate-vs-sole-prop-decision-2026-06-12.md`

## Why this is open

Roadmap item `R-Q1-F-001` is founder-decision only (per `agent_brief.prompt_skeleton`). Agent ran the CFO sub-agent brief on 2026-06-13. Founder must:

1. Read the brief at `docs/agent-reports/2026-06-13-incorp-decision-brief.md`
2. Write decision text in `docs/company/00-orchestrator.md`
3. Create `docs/legal/foundation-registration-numbers.md` (founder-only SoT)
4. Set `incorp_decision_made: 1` in `docs/roadmap/_manual-kpis.yml`
5. Flip frontmatter `status: shipped` + add `shipped_at` to `docs/roadmap/items/Q1/finance/001-decide-incorporate-vs-sole-prop-founder-decision-1.md`

## Recommended decision (CFO)

Keep Section 8 Foundation as primary entity. Scope `Bhaktisetu Tech Pvt Ltd` subsidiary in Q2 when L4+L5 commercial revenue exceeds 20% of total MRR for 2 consecutive months OR pre-seed term-sheet received. Current run-rate already at 26% — tripwire pre-armed.

## 6 open questions for founder

1. Registration numbers SoT location
2. Board composition overlap (Foundation vs Pvt Ltd subsidiary)
3. FCRA application timing (Q3 vs Q4 — blocks NRI USD lane)
4. Founder stipend vehicle (Foundation vs Pvt Ltd payroll)
5. Asset ownership (domain / IP / brand — Foundation or subsidiary)
6. Bank account split (Foundation current + Pvt Ltd current + escrow)

## Closes

R-Q1-F-001 (agent portion). Founder action closes item end-to-end.
