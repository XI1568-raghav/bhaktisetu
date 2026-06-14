---
id: R-Q3-S-002
title: "Onboard 25 verified pandits in Kolkata (new city — east expansion)"
category: supply
owner_role: sales
quarter: Q3
month_target: 7
priority: P0
status: in_progress
agent_assignable: false
founder_blocker: "Recruitment + KYC of 25 humans is founder/sales-ops execution; agent ships structured handoff only."
depends_on: ["R-Q1-S-001", "R-Q1-S-003", "R-Q2-S-002"]
blocks: []

kpi:
  metric: "verified_pandits_count_kolkata"
  current: 0
  target: 25
  unit: "count"
  source: "supabase"
  query: |
    SELECT COUNT(*) FROM "Priest" p
    JOIN "User" u ON p.user_id = u.id
    WHERE p.verified = true
      AND p.aadhaar_verified = true
      AND u.city ILIKE '%kolkata%';

revenue_impact:
  amount_inr: 75000
  confidence: medium
  basis: "Imported from year-1 plan; 25 pandits × avg ~3 paid pujas/mo × ₹1000 platform-side ≈ ₹75k MRR baseline. Durga Puja burst could push 2-3x in Sep-Oct."

est_hours: 36
est_cost_inr: 0

success_criteria:
  - "25 verified Kolkata pandits (verified=true AND aadhaar_verified=true AND city ILIKE '%kolkata%')"
  - "Each onboarded via /priest-onboarding web flow with KYC + bank account"
  - "Each has Bengali in Priest.languages (non-negotiable for Kolkata market)"
  - "First test puja completed + video proof + Bengali recitation audio quality verified before flipping verified=true"
  - "At least 5 pandits available for live remote Durga Puja Anjali on Maha Saptami/Ashtami/Navami 2026"
  - "≥10 pandits show active sessions in /priest/bookings within 14 days of verification"

agent_brief:
  context_files:
    - "docs/supply/R-Q3-S-002-handoff.md"
    - "docs/supply/R-Q2-S-002-handoff.md"
    - "docs/supply/hyderabad-pandit-onboarding-spec.md"
    - "docs/supply/antim-sanskar-pandits-onboarding-spec.md"
  prompt_skeleton: |
    R-Q3-S-002 is founder-action-required — 25 Kolkata pandit recruits cannot be
    executed by an agent. Agent contributions limited to: (a) refining outreach
    scripts in Bengali, (b) drafting NRI Bengali diaspora marketing copy for
    Durga Puja gift-puja capture, (c) monitoring KPI (Supabase SELECT in
    frontmatter) weekly and reporting drift, (d) filing eng follow-up items
    if onboarding flow gaps surface (e.g. Bengali-script name validation,
    ghat-area pincode rejection, Tarpan service catalogue gap).
    Do NOT auto-claim shipped status; only founder flips after SQL returns 25.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-15: handoff doc shipped at docs/supply/R-Q3-S-002-handoff.md.
    KPI SQL populated. Status stays in_progress until founder recruits 25
    and SQL returns 25. agent_assignable flipped to false — recruitment of
    humans is not agent work. founder_blocker populated. Target hard deadline:
    verified=true for ≥5 pandits by mid-September 2026 to capture Durga Puja
    (Mahalaya falls Sep 21, 2026).

tags: ["supply","pandit","kolkata","east","durga-puja","bengali","founder-action-required"]
created_at: 2026-06-09T22:02:56.063Z
updated_at: 2026-06-15T00:00:00.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters

East India is ~22% of Hindu population but currently 0% of platform pandit supply. Kolkata is the only viable Q3 anchor city for east expansion (Bengaluru, Mumbai, Hyderabad already covered; Bhubaneswar / Guwahati are Q4+ candidates).

**Durga Puja (Sep-Oct 2026, Mahalaya = Sep 21) is the single biggest east-India devotional event of the year.** A Q3 launch with ≥5 verified Kolkata pandits available for live remote Maha Saptami/Ashtami/Navami Anjali captures the highest-intent festival window of the year for the segment + opens the NRI-Bengali gift-puja pipeline (NJ, Houston, Bay-area Bengali Associations, London Probasi — none of which can currently be served).

**Shakta tradition + Kali worship are under-served.** Current Mumbai / Bengaluru / Hyderabad cohorts skew Vaishnava + Shaiva. Kolkata adds Devi/Shakti specialists for the first time, unlocking Kali Puja + Saraswati Puja + Lakshmi Puja SKU credibility nationwide.

# Reference material

- **Full execution spec**: `docs/supply/R-Q3-S-002-handoff.md`
- Mumbai +25 template: `docs/supply/R-Q2-S-002-handoff.md`
- Reusable script template: `docs/supply/hyderabad-pandit-onboarding-spec.md`
- Overlapping specialist segment: `docs/supply/antim-sanskar-pandits-onboarding-spec.md`
