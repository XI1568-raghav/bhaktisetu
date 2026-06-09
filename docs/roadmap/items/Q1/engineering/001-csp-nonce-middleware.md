---
id: R-Q1-E-001
title: CSP nonce middleware completion + per-page schema
category: engineering
owner_role: cto
quarter: Q1
month_target: 1
priority: P1
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: [R-Q1-E-002]

kpi:
  metric: pages_with_csp_nonce
  current: 1
  target: 250
  unit: count
  source: gh_repo
  query: "grep -r 'nonce={nonce}' apps/web/app/ --include=*.tsx | wc -l"

revenue_impact:
  amount_inr: 0
  confidence: high
  basis: "security hygiene; no direct revenue"

est_hours: 6
est_cost_inr: 0

success_criteria:
  - "curl -sI https://darshya.online/ returns CSP header with nonce-{base64} + strict-dynamic, NO unsafe-inline in script-src"
  - "Browser DevTools console on home: NO CSP violations across Razorpay/Stripe/PostHog/GTM/CF/AdSense"
  - "≥ 100 pages have inline scripts with nonce attr"

agent_brief:
  context_files:
    - apps/web/middleware.ts
    - apps/web/app/layout.tsx
    - docs/company/01-cto.md
  prompt_skeleton: |
    CTO sub-agent. Complete CSP nonce migration from prior commit 7adbd87.
    147 page-level JSON-LD scripts need nonce={nonce} codemod via jscodeshift or sed.
    Verify per success_criteria above.

handoff_notes: |
  2026-06-08 commit 7adbd87 shipped middleware + layout wiring. 146 pages still pending codemod.
  2026-06-10: created roadmap item from TASKS.md deferred list.

tags: [security, csp, nonce, p1]
created_at: 2026-06-10T19:00:00Z
updated_at: 2026-06-10T19:00:00Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
CSP nonce shipped via middleware (7adbd87) but only home page lit up. 146 routes still vulnerable to inline-script XSS via 3rd-party loaders.

# Reference material
- HANDOFF #20 in TASKS.md
- docs/company/01-cto.md security row
- middleware.ts L1-30 nonce generation

# Already shipped
- Middleware
- `_headers` unsafe-inline drop
- Layout `<Script nonce={nonce}>` wiring (home only)

# Risks
- 3rd-party scripts (Razorpay, Stripe) may not propagate nonce → strict-dynamic catches most; manual whitelist for stragglers
- Codemod may touch generated routes — exclude `.next/` + `node_modules/`
