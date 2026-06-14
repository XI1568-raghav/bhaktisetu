---
id: R-Q3-L-002
title: "GDPR compliance for UK NRI launch — DPA + cookie banner + lawful basis register"
category: legal
owner_role: legal
quarter: Q3
month_target: 7
priority: P0
status: shipped
agent_assignable: true
founder_blocker: 'U2'
depends_on: ["R-Q3-G-001"]
blocks: []

kpi:
  metric: "gdpr_compliance_complete"
  current: 0
  target: 1
  unit: "count"
  source: "manual"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 32
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["gdpr","uk","compliance","launch"]
created_at: 2026-06-09T22:02:52.941Z
updated_at: 2026-06-09T22:02:52.941Z
shipped_at: 2026-06-14T00:00:00.000Z
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
UK NRI launch (R-Q3-G-001) requires UK GDPR + DPA 2018 + PECR compliance before any UK
resident data is processed. Material risk: ICO enforcement (up to 4% global turnover),
loss of UK market access, processor contracts cannot be signed without DPA template.

# What shipped (2026-06-14, R-Q3-L-002 batch)

- `apps/web/components/CookieBanner.tsx` — ICO-grade banner: Essential always on, Analytics
  (PostHog + Cloudflare), Marketing (Google Ads + Meta) opt-in. Reject-all sized = Accept-all.
  Granular per-category toggle. 12-month re-prompt. localStorage `darshya_cookie_consent_v1`.
  Mounted via `DeferredClientWidgets` (lazy, no SSR hit).
- `apps/web/__tests__/CookieBanner.test.tsx` — 8 vitest cases (banner show/hide, reject-all,
  accept-all, granular save, stale consent expiry, version mismatch, hasConsent helper).
- `apps/web/app/legal/privacy-uk/page.tsx` — UK-specific privacy notice (UK GDPR rights,
  Art 27 representative, ICO complaint route).
- `apps/web/app/legal/cookies/page.tsx` — Cookie Policy with category table + ICO consent
  language + re-prompt cadence.
- `docs/legal/data-processing-agreement.md` — Standard processor DPA template (9 sections,
  3 annexes, SCC/UK IDTA transfer language).
- `docs/legal/records-of-processing-activities.md` — Article 30 ROPA with 7 processing
  activities, lawful basis, retention, transfers, security per record.
- `docs/legal/dpia-uk-launch.md` — DPIA covering 10 identified risks with inherent/residual
  ratings + sign-off block.
- Existing `docs/legal/gdpr-uk-compliance-spec.md` lawful basis matrix referenced.

# Reference material
- `docs/legal/gdpr-uk-compliance-spec.md` (original spec)
- `docs/legal/privacy-policy-v2-multi-geo.md`
- `docs/legal/dpdp-user-rights-api-q2-spec.md`
- UK ICO cookie guidance: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/

# Founder action remaining

- ICO registration (£40-£60/yr) at https://ico.org.uk/for-organisations/data-protection-fee/
- Appoint UK Article 27 representative (~£500-£1500/yr or in-house at first UK hire)
- External UK-qualified data protection counsel review of DPIA + UK privacy notice pre-go-live
- Counter-sign DPAs with each processor (Stripe, Resend, Twilio, PostHog, Cloudflare, Render, Supabase)
