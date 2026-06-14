# R-Q1-SA-003 — Founder Handoff

> **Roadmap item**: R-Q1-SA-003 (P2, Q1, sales) · **Status**: in_progress · **Founder action required**: yes

## Summary

Sringeri Math direct outreach scaffold shipped. Spec already existed at `docs/sales/sringeri-math-outreach-spec.md` (R-Q1-SA-003 roadmap dependency, sibling of R-Q3-SA-001 anchor LOI tier-3 fallback). This batch adds the operational tracking surface — `docs/agent-reports/sringeri-outreach.md` — referenced directly by the KPI query:

> `manual-kpi-1-if-docs-agent-reports-sringeri-outreach-md-has-status-equals-intro-call-completed-or-LOI-signed-with-date-stamp`

## Why this stays in_progress (not shipped)

Per Known Pitfalls in project conventions: KPI requires founder action (relationship recruitment). Agent ships scaffold + handoff; status flip to `completed` requires founder to:

1. Personalize + send first outreach email (template provided)
2. Drive Bengaluru → Sringeri for in-person meeting (4hr drive, Q1 window)
3. Log the intro call in `docs/agent-reports/sringeri-outreach.md` touch table
4. Flip the `status:` field in that file to `intro-call-completed` with date

## What this batch delivers

- **`docs/agent-reports/sringeri-outreach.md`** — operational tracking file (referenced by KPI query verbatim). Contains:
  - Decision-maker map (TBD slots with `[VERIFY-FOUNDER]` tokens, no fabricated names/emails)
  - Warm-intro candidate table (founder personal network slots)
  - Touch log (append-row per outreach attempt)
  - Status field (drives KPI flip)
  - Ready-to-personalize outreach email draft (3-paragraph per spec `prompt_skeleton`)
  - Founder action checklist
  - Sub-agent assignable tasks (LinkedIn scrape, follow-up drafts, news context)

## What the founder MUST do (cannot agent-assign)

1. **Verify decision-maker contacts** at Sringeri Math + Sharada Peetham admin via LinkedIn or warm intro. Sub-agent can scrape; founder validates real human + correct role.
2. **Personalize outreach email** in `docs/agent-reports/sringeri-outreach.md` — replace `[Founder Name]` + `[VERIFY-FOUNDER]` placeholders.
3. **Send email** to Sringeri Charitable Trust + admin in parallel (target: Jan 2026).
4. **Schedule physical Bengaluru → Sringeri visit** if Q1 reply received (4hr drive, Feb 2026 window).
5. **Log every touch** (send, reply, follow-up, call) in the touch table.
6. **Flip `status:`** to `intro-call-completed` + date stamp when intro call lands — this is the KPI trigger that closes R-Q1-SA-003.

## Sub-agent next actions (assignable now)

- LinkedIn scrape queries (specified in outreach log):
  - `site:linkedin.com "Sringeri Math" OR "Sringeri Sharada Peetham"`
  - `site:linkedin.com "Sringeri Charitable Trust"`
  - `site:linkedin.com Vidyaranya Foundation Bengaluru`
- Append findings to decision-maker map with source citation + verification flag.
- Draft 3 follow-up email variants (warm-founder, technical-pitch, partnership-mechanics) for D+5 if no reply.
- Pull recent public news on Sringeri Math activities for email personalization context.

## Q3 chain

Per `docs/sales/anchor-temple-chain-loi-q3-spec.md` (R-Q3-SA-001), Sringeri is the tier-3 fallback anchor if ISKCON + BAPS Q3 outreach fails. Q1 intro establishes the warm contact; Q3 deepens to LOI discussions.

## Files in this batch

- `docs/agent-reports/sringeri-outreach.md` — NEW operational tracking surface (KPI-referenced)
- `docs/sales/R-Q1-SA-003-handoff.md` — NEW this file
- `docs/roadmap/_ship-log-2026-06-15.md` — APPEND batch row

## Spec dependency (existing, unchanged)

- `docs/sales/sringeri-math-outreach-spec.md` — Q1 outreach plan (unchanged, authored 2026-06-13)

## Closes

R-Q1-SA-003 — Q1-SA-003-batch-2026-06-15: scaffold + handoff shipped. Status remains `in_progress` pending founder action (intro call).
