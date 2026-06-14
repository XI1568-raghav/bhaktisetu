# B2B Series A Enterprise Pipeline Tracker — R-Q4-SA-005

> Status: scaffold shipped 2026-06-14. Founder owns outreach + qualification. Agent maintains template + cadence; cannot generate qualified leads on its own.

## Target

15 qualified enterprise leads across 5 lead categories by Q4-end → 5 pilot agreements in discussion → 2 contracts signed → ₹50L+ B2B pipeline.

## Qualification rubric (lead must clear ALL 4 to count as qualified)

1. **Right buyer**: VP/Director-level or higher with budget authority OR confirmed routing to one
2. **Pain confirmed**: Verbal acknowledgement of use case (corporate gifting / wellness / NRI benefit / temple-chain digitization / tourism)
3. **Timeline**: Decision window inside next 6 months
4. **Scoping call booked**: 30-min discovery call calendared (not "let's connect later")

Any lead missing one of these = `in_discussion`, not `qualified`.

## Pipeline kanban (founder updates weekly)

> Replace `{{founder-confirms-name}}` and `{{founder-confirms-email}}` tokens only after founder verifies via LinkedIn/intro/cold reply. Do NOT fabricate names.
>
> **Per triage 2026-06-15**: Contact-person names REQUIRE `[VERIFY-FOUNDER]` prefix — agent does not fill from public sources without explicit founder verification. Account names (TCS, Infosys, ISKCON Bengaluru, etc.) are public org names and OK without prefix.

### Tier 1 — Corporate gifting (target 5 qualified)

| # | Account | Buyer role | Stage | Last touch | Next action | Owner |
|---|---|---|---|---|---|---|
| 1 | TCS | Head of Employee Engagement | prospect | — | LinkedIn intro req | founder |
| 2 | Infosys | CHRO office | prospect | — | LinkedIn intro req | founder |
| 3 | Wipro | Head of Rewards | prospect | — | LinkedIn intro req | founder |
| 4 | HDFC Bank | Employee Benefits lead | prospect | — | LinkedIn intro req | founder |
| 5 | ICICI Bank | HR Operations Director | prospect | — | LinkedIn intro req | founder |
| 6 | Reliance Industries | CSR / Employee Engagement | prospect | — | LinkedIn intro req | founder |
| 7 | Tata Steel | Corporate Affairs | prospect | — | LinkedIn intro req | founder |

### Tier 2 — White-label temple chain (target 3 qualified)

| # | Account | Buyer role | Stage | Last touch | Next action | Owner |
|---|---|---|---|---|---|---|
| 1 | ISKCON Bengaluru | Temple president | prospect | per R-Q3-SA-002 | follow-up call | founder |
| 2 | BAPS Swaminarayan | Central admin | prospect | per R-Q4-SA-004 | HAF warm intro | founder |
| 3 | Sringeri Math | Math admin | prospect | per sringeri-math-outreach-spec.md | second outreach | founder |

### Tier 3 — Insurance / wellness (target 3 qualified)

| # | Account | Buyer role | Stage | Last touch | Next action | Owner |
|---|---|---|---|---|---|---|
| 1 | Religare Health | Wellness benefits lead | prospect | — | cold email | founder |
| 2 | HDFC Ergo | Group health product | prospect | — | cold email | founder |
| 3 | Star Health | Wellness add-on lead | prospect | — | cold email | founder |
| 4 | Niva Bupa | Product manager mental wellness | prospect | — | cold email | founder |

### Tier 4 — NRI bank (target 2 qualified)

| # | Account | Buyer role | Stage | Last touch | Next action | Owner |
|---|---|---|---|---|---|---|
| 1 | HDFC NRI | NRI proposition head | prospect | — | LinkedIn intro req | founder |
| 2 | ICICI NRI | NRI Banking VP | prospect | — | LinkedIn intro req | founder |
| 3 | Axis NRI | NRI products lead | prospect | — | LinkedIn intro req | founder |

### Tier 5 — Government tourism (target 2 qualified)

| # | Account | Buyer role | Stage | Last touch | Next action | Owner |
|---|---|---|---|---|---|---|
| 1 | Karnataka Tourism Dept | Director temple tourism | prospect | — | RTI lookup + cold mail | founder |
| 2 | Tamil Nadu HR&CE | Commissioner office | prospect | — | RTI lookup + cold mail | founder |
| 3 | UP Tourism (Kashi/Ayodhya) | Tourism Secretary | prospect | — | warm intro via Varanasi network | founder |

## Stage definitions

- `prospect` — identified, not yet contacted
- `contacted` — first cold outreach sent (LinkedIn + email)
- `responded` — buyer or proxy acknowledged
- `discovery` — 30-min scoping call booked / completed
- `qualified` — 4-rubric check cleared
- `pilot_scoping` — terms being drafted
- `pilot_signed` — MSA/LOI signed
- `lost` — explicit decline OR 60-day no-response

## Weekly cadence (founder)

- **Monday 30min**: review pipeline, set 5 outreach targets for week
- **Mid-week**: send 5 cold outreach (LinkedIn + email same day, follow-up T+3 days)
- **Friday 30min**: update tracker stages, log conversations

## Tooling

- LinkedIn Sales Navigator (founder login)
- Pitch deck v2 (R-Q2-M-002)
- B2B-specific addendum at `docs/sales/strategic-partnerships-matrix-15.md`
- Cold email templates at `docs/sales/cold-email-templates-10-use-cases.md`
- Founder one-pager summaries at `docs/sales/founder-one-pager-summaries.md`

## KPI source (TBD — depends on signal-context bootstrap)

Roadmap item `R-Q4-SA-005` exposes metric `b2b_qualified_leads`. Once signal-context KPI collector path is finalised (see R-Q4-S-007-handoff), inline this query into `scripts/agents/roadmap/_kpi-supabase.mjs`:

```sql
SELECT COUNT(*) FROM b2b_enterprise_leads
WHERE qualification_status = 'qualified'
  AND created_at >= date_trunc('quarter', now());
```

(Table does not yet exist — same schema-apply path described in R-Q4-S-007-handoff applies if/when founder wants to move tracker from markdown to DB.)

## Closes

R-Q4-SA-005 — scaffold + tracker shipped. Status remains `in_progress` until founder closes 15 qualified leads.
