---
id: R-Q3-S-007
title: "Onboard 10 Canada-based verified pandits (Toronto + Vancouver + Brampton)"
category: supply
owner_role: sales
quarter: Q3
month_target: 8
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: ["R-Q3-G-002"]

kpi:
  metric: "verified_pandits_count_canada"
  current: 0
  target: 10
  unit: "count"
  source: "supabase"
  query: "SELECT COUNT(*) FROM priests p JOIN users u ON p.user_id = u.id WHERE p.kyc_status = 'approved' AND u.location_country = 'CA' AND u.location_city IN ('Toronto','Vancouver','Brampton'); target 10"

revenue_impact:
  amount_inr: 150000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 40
est_cost_inr: 0

success_criteria:
  - "10 Canada-based pandits onboarded across Toronto (5) + Vancouver (3) + Brampton (2) by Aug 31"
  - "Each pandit Canada-equivalent KYC approved + 3+ puja SKUs live + CAD pricing (NRI 9-10× domestic per business rule #2)"
  - "Pre-req R-Q2-G-007 Canada NRI launch landing page + Stripe CAD rail live (U2 unblock)"
  - "Brampton sub-target ≥ 2 (highest Punjabi/Sikh+Hindu density per Statistics Canada census)"

agent_brief:
  context_files:
    - apps/api/src/routes/admin-leads.ts
    - scripts/agents/cold-temple-outreach.mjs
    - apps/web/app/become-pandit/page.tsx
    - apps/api/src/routes/priests.ts
    - docs/company/06-supply.md
  prompt_skeleton: |
    Supply sub-agent. P0 Canada pandit onboarding — 10 verified across Toronto/Vancouver/Brampton.
    Source via Hindu Federation of Canada + ISKCON Toronto/Vancouver + BAPS Toronto + Brampton Hindu temples (highest Punjabi+Hindu density per Stats Canada census 2021).
    Pipeline: lead in admin-leads source='canada_pandit_outreach' → Canada KYC (passport + Canada PR/citizenship + address proof) → Stripe CAD onboarding (founder-blocker U2) → 3 puja SKUs live → first booking.
    Pricing: NRI 9-10× domestic per business rule #2 (e.g. ₹500 INR puja = CAD $80-90).
    Blocks R-Q3-G-002 Canada soft launch — cannot activate Canada NRI w/o 10+ local pandits.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-13: Prospecting infra + outreach kit + tests shipped (cycle slice).
    - apps/api/scripts/leads/_canada-cities.ts — Canada city tier (Toronto/Vancouver/Brampton/Mississauga/Surrey)
    - apps/api/scripts/leads/canada-pandit-prospector.mjs — runner, honors robots.txt + 2s rate limit, --dry mode
    - data/leads/canada-pandits-2026-06.csv — 52 leads (Toronto 21 + Vancouver 11 + Brampton 9 + Mississauga 6 + Surrey 5); 10 queued for batch-1 send
    - scripts/sales/canada-pandit/ — EN + HI (Devanagari + Romanized) + WA + day-5 follow-up + CASL footers + KYC checklist + README
    - docs/agent-reports/2026-06-12-canada-pandit-outreach.md — methodology + KPI query
    - 4 vitest files green (canada-cities + prospector + templates + csv-output)
    - Tests: pnpm test -- canada (root vitest config extended)
  2026-06-12: Research + outreach kit shipped (cycle slice). docs/sales/canada-pandit-prospects-2026-06.md w/ 30 prospects:
    - 12 GTA (BAPS, ISKCON, Hindu Heritage Centre, Vishnu Mandir, etc + federation umbrella via Hindu Federation Canada)
    - 6 Vancouver / Lower Mainland (Vishwa Hindu, Lakshmi Narayan, BAPS Surrey, Sanatan Dharm BC, ISKCON, Sai)
    - 4 Calgary/Edmonton (Hindu Societies + BAPS + Maha Lakshmi)
    - 4 Ottawa/Montréal (Hindu Temple Ottawa-Carleton, Vishva Shakti Durga, Hindu Mission Canada, Thiru Murugan Tamil Saiva)
    - 4 independent pandits via LinkedIn / federation referrals
  Cold-outreach email template (190 words) + 4 sampradaya-specific customisations (BAPS / Tamil Saiva / ISKCON / Federation) + WA follow-up script + 10-day pace plan (3/day × 30).
  ZERO sends from agent. Every `[VERIFY]` marker requires founder validation via temple website / LinkedIn before send.
  Risk notes: BAPS 30-day cycle, CRA partnership ambiguity (transparent: pilot is commercial pandit-listing not tax-deductible v1), federation orgs are highest leverage (3-6 month cycle).
  SCRAPER DEFERRED to next cycle (leads schema gate per spec — `apps/api/scripts/leads/` schema must be confirmed before scrape-canada-pandits.ts can be authored).
  FOUNDER ACTION: ≤6h spread over 14 days for verification + personalisation + send + reply triage.
  Closes (partial): Q-C-20260612T0001-R-Q3-S-007 (research+kit slice). Status stays in_progress until 30 sends + 5 qualified replies + 1+ pandit onboarded.

tags: ["supply","pandit","canada","nri"]
created_at: 2026-06-09T22:02:56.063Z
updated_at: 2026-06-13T00:00:00.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
