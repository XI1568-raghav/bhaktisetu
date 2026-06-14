# R-Q4-SA-005 Handoff — B2B Series A Pipeline (15 Enterprise Leads)

> Status: scaffold + pipeline tracker shipped 2026-06-14. Founder owns all outreach + qualification. Agent cannot generate qualified enterprise leads; founder relationship + verbal qualification = the work.

## What this batch shipped

| Artifact | Path |
|---|---|
| Lead category spec (Q4 plan) | `docs/sales/b2b-series-a-pipeline-spec.md` (existed prior batch) |
| Pipeline kanban tracker (5 tiers × 18 named accounts) | `docs/sales/trackers/b2b-series-a-enterprise-pipeline.md` (new) |
| Qualification 4-point rubric | embedded in tracker |
| Stage definitions + weekly cadence | embedded in tracker |
| Cold outreach templates referenced | `docs/sales/cold-email-templates-10-use-cases.md` (existed) |
| Strategic partnerships matrix | `docs/sales/strategic-partnerships-matrix-15.md` (existed) |

## founder-action-required (BLOCKING — agent cannot do)

### 1. Outreach execution (the actual work)

Agent listed account targets by tier; founder must:

- [ ] Verify each account is correctly identified (org change, M&A, etc)
- [ ] Look up actual buyer name via LinkedIn Sales Navigator
- [ ] Send 5 cold outreach per week per cadence in tracker
- [ ] Book 30-min discovery calls
- [ ] Apply 4-point qualification rubric per call
- [ ] Update tracker stage weekly

### 2. Pitch deck v2 + B2B addendum

Per roadmap dep `R-Q2-M-002` (pitch deck v2) — confirm deck is ready before high-value enterprise outreach. B2B-specific addendum (custom enterprise pricing slides, white-label scoping, MSA template hook) referenced in spec.

### 3. KPI signal-context wiring

Same blocker as R-Q4-S-007: `signal-context/kpi-collectors.yaml` does not exist in repo. Once founder finalises path (CLI vs prisma db execute), add the `b2b_qualified_leads` query inlined in the tracker doc to `scripts/agents/roadmap/_kpi-supabase.mjs` AND create the `b2b_enterprise_leads` table OR continue tracking in markdown.

For now KPI source = manual count of `qualified` rows in `docs/sales/trackers/b2b-series-a-enterprise-pipeline.md`.

### 4. Tracker conversion to DB (optional, only if scale demands)

Founder can keep tracker in markdown indefinitely. Move to DB only when:

- More than 50 active prospects, OR
- Multiple SDRs working same pipeline, OR
- Need automated KPI scraping for ARE

## Why agent cannot ship this end-to-end

Per CLAUDE.md KNOWN PITFALLS:

> DO NOT auto-claim shipped status on items where the KPI requires founder action.

B2B enterprise sales = founder relationship-led work:

- Buyer trust requires founder voice (not agent template)
- Names + emails must be verified (not fabricated `[VERIFY-FOUNDER]`)
- Discovery call qualification requires human judgement
- Custom pricing negotiation requires founder authority
- LOI/MSA signing requires founder signature

Agent's role = maintain template, tracker schema, cadence reminders, KPI query plumbing once tracker structure stabilises.

## Verify (post founder-action)

```bash
# Manual count of qualified leads in tracker
grep -c "qualified" docs/sales/trackers/b2b-series-a-enterprise-pipeline.md

# Or — if DB path taken later —
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM b2b_enterprise_leads WHERE qualification_status = 'qualified';"
```

Expected: 15 by Q4-end.

## Related items

- Depends: R-Q4-SA-002 (B2B scoping prep)
- Blocks: R-Q4-F-002 (Series A financial modelling needs pipeline number)
- Adjacent: R-Q3-SA-002 (ISKCON outreach), R-Q4-SA-004 (corporate Diwali gifting), strategic-partnerships-matrix-15.md

## Status

`in_progress` — remains so until 15 qualified leads logged in tracker.
