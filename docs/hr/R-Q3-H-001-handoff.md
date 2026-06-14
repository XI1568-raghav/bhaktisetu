# R-Q3-H-001 Handoff — Senior backend contractor onboarding

> **Roadmap**: `docs/roadmap/items/Q3/hr/001-senior-backend-contractor-onboarded-30hr-week-node.md`
> **JD**: `docs/hr/senior-backend-contractor-jd.md` (already shipped 2026-06-13)
> **Status**: founder-action-required
> **Target**: 1 senior backend contractor active by Oct 31 2026 (Q3 close)

## State as of 2026-06-14

The JD is complete and ready to post. This item ships in stages — code-side scaffolding is minimal; the bulk of the work is founder-led recruiting + interviewing + hiring. Sub-agents cannot interview humans.

| Lane | Status | Owner |
|---|---|---|
| JD authored (Tier mid + senior, ₹1.2-1.8L/mo) | ✅ shipped 2026-06-13 (`docs/hr/senior-backend-contractor-jd.md`) | done |
| Sourcing channels mapped (LinkedIn / AngelList / Devfolio / Twitter / referrals) | ✅ in JD | done |
| Interview process defined (3 rounds × 4 hr) | ✅ in JD | done |
| Onboarding 30-day plan | ✅ in JD | done |
| Post JD on AngelList + LinkedIn + Twitter | ⏳ founder action | founder |
| Calendar 5 intro calls/week × 2 weeks | ⏳ founder action | founder |
| Pay trial-task budget ₹10K (5 × ₹2K) | ⏳ founder action | founder |
| Pick best fit | ⏳ founder action | founder |
| First PR merged from contractor | ⏳ post-hire | contractor |
| KPI `senior_contractor_active = 1` | ⏳ on hire | manual KPI |

## What sub-agent can do (now)

- Refine JD copy if founder wants ATS-optimized variant
- Draft initial outreach DMs for LinkedIn 1st-degree network
- Draft Twitter open-hire thread
- Mock interview questions per round
- Score-card template for code review session

## What sub-agent cannot do

- Run interviews
- Negotiate compensation
- Make hire decision
- Onboard contractor into Slack / GitHub / 1Password

## Trigger conditions (per JD "Why now")

JD says "Q3 (Oct 2026) when MRR > ₹2L + API workload exceeds founder solo capacity". Before posting:

1. Verify MRR via Razorpay dashboard
2. Confirm founder bandwidth crisis (calendar audit — >60 hr/week eng + bookings ≥ 100/wk)
3. Confirm cash runway covers 6 months contractor invoice

If all 3 green → founder posts JD same day. If any red → defer to Nov/Dec.

## Manual KPI update

When contractor is onboarded and first PR merges:

```yaml
# docs/roadmap/_manual-kpis.yml
last_updated: 2026-XX-XX
values:
  senior_contractor_active: 1
```

Then flip roadmap item `status: in_progress → shipped` + add `shipped_at: 2026-XX-XX`.

## Closes

R-Q3-H-001 — code-side scaffolding complete. Status flips on first contractor onboarded (founder-led).
