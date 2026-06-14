# R-Q2-S-001 Handoff — Onboard +25 verified pandits in Bengaluru (cumulative 55)

> Status: founder-action-required. Engineering scaffold only — sales/ops execution required from founder + sales hire (when made).

## Spec source

`docs/roadmap/items/Q2/supply/001-onboard-25-verified-pandits-in-bengaluru-cumulativ.md` — placeholder body, success_criteria + agent_brief.prompt_skeleton are TBD. Bulk-imported 2026-06-09.

## Why this matters

Cumulative target 55 verified pandits in Bengaluru by end of Q2 (month_target 4 = April). Bengaluru is the highest-density NRI-anchored south-Indian metro and supply gate for Karnataka/AP/Telangana puja booking SKUs. Builds on R-Q1-S-002 (Q1 baseline of 30).

KPI: `verified_pandits_count_bengaluru` (Supabase). Query TBD — wire to `Priest.aadhaarVerified=true AND Priest.serviceCity LIKE '%Bengaluru%' OR '%Bangalore%'` once schema query confirmed.

## Founder action items (sales execution)

1. **Source 25 candidates** (target 50 sourced → 25 verified gate):
   - Iyengar/Smartha/Madhva community WhatsApp groups (NDPL, Karnataka Brahmin Sabha)
   - Bengaluru-area mathas: Uttaradi Math, Pejawar Math, Sringeri branch
   - Existing pandit referrals (each verified pandit asked for 2 referrals — already in onboarding-fleet-v2 drip)
   - LinkedIn pandit/purohit job filter Bengaluru
   - Justdial / Sulekha pandit listings cold-call
2. **Verification pipeline** (existing system, gate is Aadhaar + skill demo):
   - Aadhaar OTP via existing `/api/v1/auth/aadhaar/*` endpoints
   - 3-puja skill demo recorded on phone (Ganapathi Homa / Satyanarayan / Rudrabhishek) — uploaded via priest-portal
   - Reference call to one previous client
3. **Activation** (post-verify):
   - Priest portal walkthrough (15-min Zoom)
   - First listing on /priests + /pujas/[slug]/pandits matrix
   - Payout bank details (gated on aadhaarVerified per business rule #4)

## Engineering scaffold (this commit)

- This handoff doc.
- `Closes: Q-C-...-R-Q2-S-001` trailer on commit + PR.
- No code change — supply onboarding pipeline (priest signup → KYC → admin verify → activate) was shipped in prior sprints. See:
  - `apps/api/src/routes/priest-signup.ts`
  - `apps/api/src/routes/admin-priests.ts` (verify gate)
  - `apps/web/app/priest/onboarding/` flow
  - `scripts/agents/onboarding-v2/pundit.mjs` (daily drip agent — already running per onboarding-fleet-v2.yml cron)

## Tracking

- Founder updates `docs/roadmap/_manual-kpis.yml` weekly with `verified_pandits_count_bengaluru` actual.
- When cumulative hits 55: flip item status to `shipped` + set `shipped_at` + `verified_at` once first paid puja booking lands from one of the new 25.
- Tripwire: if <10 verified by end-of-April, escalate — re-source from Karnataka temple Trust contacts.

## Deferred

- Real KPI Supabase query string population (depends on confirming Priest.serviceCity field — to be done in next agent cycle).
- agent_brief.prompt_skeleton population (sales-agent drip template — will be filled by next Decision Agent cycle).

## Label

`founder-action-required` (sales execution, not engineering work).
