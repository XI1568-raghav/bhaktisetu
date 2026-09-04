# R-Q4-IT-002 Handoff — Post-scale cost optimization audit (Render + Cloudflare + Supabase + Razorpay)

> **Item**: R-Q4-IT-002 · **Category**: IT · **Priority**: P0 · **Status**: founder-action-required · **Date**: 2026-06-14
>
> **Spec**: `docs/roadmap/items/Q4/it/002-post-scale-cost-optimization-audit-render-cloudfla.md`
> **Depends on**: R-Q4-E-004 (scale-readiness work — quarterly target Q4 / month 12)
> **KPI**: `monthly_infra_cost_inr` — target ≤ ₹150,000/mo (Q4 month-12 ceiling)
> **Est hours**: 24 (founder cycle 1 review pass)

> ## Correction banner — 2026-09-02 (`OPS-10`)
>
> This handoff was written on 2026-06-14 against a stack that has since changed in two
> ways that invalidate specific cost lines below. Nothing has been deleted: the audit
> template is still the deliverable, and the modelling is left legible so it can be
> re-run once the owner supplies the missing facts. What was wrong, verified by reading
> this repository on 2026-09-02:
>
> | Claim in this document | Reality |
> |---|---|
> | **Cloudflare Pages** hosts the web tier; 500 builds/mo is a live cost ceiling; "currently ~32/mo" | Pages has not been a hosting layer since the 2026-07-08 cutover (`cf-kill-zombie.yml`, `docs/render-web-cutover-runbook.md`). The web tier is a Render Docker service, `darshya-web`, `region: oregon` (`render.yaml:52-60`). Cloudflare is DNS + edge proxy only. There is no Pages build quota to audit, and the "~32/mo" figure describes a pipeline that no longer runs. |
> | **Stripe** is the NRI rail at "3.5% per txn + ₹2 fixed" | **Stripe was removed from the codebase on 2026-08-11.** Every remaining mention in `apps/api/src` is a removal note (`lib/env.ts:45-46`, `services/payment.service.ts:2506-2517`, `routes/payments.ts:304`, `routes/subscriptions.ts:274`). Razorpay is the only live rail and it settles **INR only**. **No replacement international processor has been chosen**, so the NRI fee rate is not 3.5%, is not any other number in this repository, and cannot be modelled until the owner names the rail. |
> | Render free tier "750hr/mo, 96% saturated" per service | The 750 instance-hours are per **account**, not per service, and two always-on free services need ~1,488h. The account was suspended for exactly this on 2026-08-17. See `docs/free-tier-budgets.md`. |
>
> **How to use the NRI rows below.** They are marked
> `[verify — Stripe was removed; the NRI rail is undecided]`. The *structure* of the
> modelling — a per-transaction percentage, a fixed component, a tripwire on
> fee-spend as a share of NRI GMV — is sound and should be re-run unchanged the moment
> a processor exists. Only the processor name and the rate are unknown. Do not
> substitute a guessed rate: a cost audit that invents its own inputs is worse than one
> with a hole in it.

## Why this matters

Bhaktisetu's Q1-Q3 engineering doctrine has been "free tier first" — every workflow, cron, SDK, and agent is gated against the `docs/free-tier-budgets.md` ceilings. By Q4 (month 12) the platform must absorb post-scale traffic + commerce volume without ripping through paid-tier overages.

Without a quarterly audit cadence:
- Render free tier (750hr/mo, 96% saturated per current TASKS.md) silently rolls into paid as second always-on service is added
- ~~Cloudflare Pages 500 builds/mo cap (currently ~32/mo) absorbs N% headroom but spikes during incident-fix loops (the 2026-05-30 incident burned 60 builds to recover one bug)~~ — **no longer a cost line.** Pages stopped hosting the web tier on 2026-07-08; the web tier is Render `darshya-web` (`render.yaml:52-60`). The 2026-05-30 build-burn incident was real but its mechanism is gone. Corrected 2026-09-02 (`OPS-10`)
- Supabase 500MB DB + 5GB egress (currently <1%) will tip into paid the first time a content-table grows past 100k rows
- Razorpay transaction fees (2% domestic; the NRI/foreign-currency rate is **`[verify — Stripe was removed; the NRI rail is undecided]`**, previously modelled at 3.5%) compound into 4-6 figures/mo at scale and need MOR / aggregator rate negotiation

This item is the **quarterly cost guardrail** — without it, infra cost grows unbounded as the platform scales.

## What is shipped (engineering hand)

| Artifact | Status |
|---|---|
| Free-tier budgets doctrine + per-resource caps | ✅ `docs/free-tier-budgets.md` |
| Per-service operational context + deploy mechanism + key location | ✅ `docs/operational-context.md` |
| ~~CF Pages 3 MiB worker bundle cap discipline~~ — **obsolete 2026-09-02 (`OPS-10`)**: no Pages build pipeline exists; Render runs Next standalone on Node with no worker-bundle limit | historical record only, `docs/cf-worker-budget.md` |
| Batched-commit discipline (single push/day rule) | ✅ `CLAUDE.md` + reinforced across HANDOFFs |
| Paths-filtered GH workflows post-2026-05-28 incident (~846 min/mo baseline) | ✅ live |
| `[skip ci]` discipline on docs / api-only / agent-only commits | ✅ enforced |
| Daily uptime-pinger + broken-link + competitor-watch agents | ✅ fleet of 28 daily agents |
| Roadmap-loop orchestrator pause flag (gates ad-hoc Anthropic burn) | ✅ `docs/roadmap/_budget-snapshot.json` |

## What this audit must cover (founder execution scope)

A single quarterly review pass (~24 hours founder time, split across 3-5 sessions). The output is one MD report at `docs/it/cost-audit-2026-Q4.md` (or whichever quarter is active) with the following sections:

### 1. Current-state spend snapshot (per service, last 30 days)

| Service | Free-tier ceiling | Current usage | % saturated | Paid spend (if any) | Trend (WoW + MoM) |
|---|---|---|---|---|---|
| Render web (api + admin background) | 750 hr/mo combined | TBD | TBD% | TBD ₹ | TBD |
| ~~Cloudflare Pages~~ **row retired 2026-09-02 (`OPS-10`)** — not a hosting layer since 2026-07-08 | n/a | n/a | n/a | n/a | n/a |
| Cloudflare Workers (KV / R2 / D1 if used) | 100k req/day free | TBD | TBD% | TBD ₹ | TBD |
| Supabase DB | 500 MB Postgres + 5 GB egress | TBD | TBD% | TBD ₹ | TBD |
| Supabase Storage | 1 GB + 5 GB egress | TBD | TBD% | TBD ₹ | TBD |
| GH Actions | 2000 min/mo | TBD | TBD% | TBD ₹ | TBD |
| Resend | 100/day + 3000/mo | TBD | TBD% | TBD ₹ | TBD |
| Razorpay (domestic) | 2% per txn (no monthly cap) | TBD | n/a | TBD ₹ | TBD |
| NRI / foreign-currency rail — **`[verify — Stripe was removed; the NRI rail is undecided]`** | rate unknown until a processor is chosen (was modelled at 3.5% per txn + ₹2 fixed under Stripe) | TBD | n/a | TBD ₹ | TBD |
| Anthropic API (LLM agents + roadmap-loop) | usage-based via Blackbox proxy | TBD tokens | n/a | TBD ₹ | TBD |
| WhatsApp Cloud (Meta) | 1000/mo free post-U7 | TBD | TBD% | TBD ₹ | TBD |
| PostHog | 1M events/mo free | TBD | TBD% | TBD ₹ | TBD |
| Sentry | 5k errors/mo free | TBD | TBD% | TBD ₹ | TBD |
| Domain + SSL (registrar) | annual | n/a | n/a | TBD ₹/yr ÷ 12 | flat |

**How to pull each row:**
- Render: dashboard → Service → Metrics → Compute hours (rolling 30d)
- ~~CF Pages: dashboard → Pages → Project → Settings → Usage tab~~ — retired; no Pages project serves traffic. Web compute hours are inside the Render row above (`darshya-web`, `srv-d970l2ks728c738fc33g`)
- CF Workers: dashboard → Workers → Analytics
- Supabase: dashboard → Project → Settings → Usage (DB size, Egress, Storage)
- GH Actions: org Settings → Billing → Actions minutes
- Resend: dashboard → API → Stats
- Razorpay: dashboard → Transactions → export CSV → SUMIF on fee column
- NRI rail: **`[verify]`** — no processor to pull from until the owner names one
- Anthropic / Blackbox: existing token-spend log in orchestrator state
- WhatsApp Cloud: Meta Business Suite → WhatsApp → Insights
- PostHog: dashboard → Settings → Billing
- Sentry: dashboard → Settings → Subscription

### 2. Per-feature cost attribution

Map current spend lines to product features so the founder can decide which features are net-positive vs net-negative:

| Feature | Service stack | Estimated monthly cost | Revenue attributed | Cost-of-revenue % |
|---|---|---|---|---|
| Live darshan IVS streams (P15) | Render + CF + IVS | TBD | TBD (commission %) | TBD |
| Puja booking (Razorpay) | Render + Supabase + Razorpay | TBD | TBD (booking fees) | TBD |
| NRI gift puja — rail **`[verify — Stripe was removed; the NRI rail is undecided]`** | Render + Supabase + WhatsApp + (NRI rail TBD) | TBD | TBD (NRI premium %) | TBD |
| Astrology consultations (Jitsi) | Render + Supabase + Razorpay | TBD | TBD | TBD |
| Daily horoscope + panchang SSG | Render (`darshya-web`) — *was CF Pages; corrected 2026-09-02 (`OPS-10`)* | TBD | indirect (SEO → bookings) | n/a — attribute |
| 28 daily agents (fleet) | GH Actions | TBD min/mo | indirect (ops automation) | n/a |
| Roadmap-loop orchestrator | GH Actions + Anthropic | TBD min + TBD tokens | indirect (planning automation) | n/a |
| Email transactional (Resend) | Render → Resend | TBD | n/a (operational) | n/a |
| Knowledge Hub + Gurukul (U16) | Render (`darshya-web`) + Supabase — *was CF Pages; corrected 2026-09-02 (`OPS-10`)* | TBD | TBD (course revenue) | TBD |

### 3. Optimization opportunities (rank by ROI: hours of founder effort vs ₹ saved/mo)

Template — populate during audit:

| Opportunity | Estimated saving/mo | Founder hours to implement | Risk | ROI rank |
|---|---|---|---|---|
| Move Render API container to single instance + autoscale | TBD | TBD | TBD | TBD |
| Migrate cold static assets to R2 (cheaper than Supabase Storage egress) | TBD | TBD | TBD | TBD |
| Negotiate Razorpay MOR rate at ≥ ₹X lakh/mo volume | TBD | TBD | TBD | TBD |
| Cache LLM agent prompts (prompt caching ~90% discount) | TBD | TBD | TBD | TBD |
| Convert weekly cron agents to bi-weekly where signal is low | TBD | TBD | TBD | TBD |
| Drop unused Sentry projects | TBD | TBD | TBD | TBD |
| Compress images via squoosh in pre-commit hook | TBD | TBD | TBD | TBD |
| Migrate `/og/*` dynamic edge routes to static pre-rendered PNGs | TBD | TBD | TBD | TBD (precedent: D-7 OG card retry static PNG saved 64 dead refs) |
| Drop legacy demo accounts + ALLOW_DEMO_TOKENS in prod | n/a (security, not cost) | TBD | TBD | n/a |

### 4. Tripwire definitions for ongoing observability

Add to `docs/roadmap/_alerts/` or equivalent. Each tripwire is a "if this happens, page founder" rule:

- Render compute hours > 90% of 750 mo cap by day 25 of month → page founder
- ~~CF Pages builds > 300 by day 20 of month (60% of 500 cap) → page founder~~ — tripwire retired 2026-09-02 (`OPS-10`): there is no Pages build pipeline to trip
- Supabase DB > 400 MB (80% of 500 MB cap) → page founder
- GH Actions > 1600 min/mo (80% of 2000 cap) → page founder
- Anthropic spend > ₹50,000 in any single week → page founder
- Razorpay txn-fee spend > 25% of GMV → page founder (means low-ticket-size mix)
- NRI-rail txn-fee spend > 30% of NRI GMV → page founder — **`[verify]`**: the threshold shape is sound, but it cannot be armed until an NRI processor exists (Stripe removed 2026-08-11)
- Any service moves from free tier → paid for first time → page founder

### 5. Decision log (one-line entries)

Track what changed this quarter:
- 2026-XX-XX: Migrated /og/temple to static PNG → saved TBD ₹/mo
- 2026-XX-XX: Negotiated Razorpay MOR rate from 2% → 1.85% → saved TBD ₹/mo
- 2026-XX-XX: Dropped Sentry on apps/admin (low traffic) → saved TBD ₹/mo

## What is blocked on founder (~24 hours, dashboard access required)

The engineering harness cannot:
- Authenticate to Render / Supabase / Razorpay / GH org-billing dashboards (MFA + email-gated to founder)
- Pull current-month invoice CSVs
- Negotiate with Razorpay for MOR rate reduction (and with an NRI processor once one is chosen — **`[verify]`**)
- Decide which features are net-positive vs net-negative (founder business call)
- Commit to which optimization opportunities to pursue (founder roadmap call)

These are physical-access + business-decision tasks for the founder.

## Pass criteria

```markdown
- [ ] Audit report shipped at `docs/it/cost-audit-2026-Q4.md` with all 5 sections populated (no TBD left in section 1)
- [ ] Per-service spend snapshot dated within last 7 days
- [ ] Per-feature cost attribution shows cost-of-revenue % for every commerce feature
- [ ] Top 5 optimization opportunities ranked by ROI + assigned founder owner
- [ ] 8 tripwires wired into `docs/roadmap/_alerts/` or equivalent paging channel
- [ ] Decision log in audit doc with at least 1 entry per quarter ongoing
- [ ] Monthly infra cost (sum of all paid-tier spend) ≤ ₹150,000 (KPI target) OR audit explains why over with mitigation plan
- [ ] Founder calendar entry created for next quarterly audit (Q1 of next year)
- [ ] `shipped_at` + `verified_at` flipped on `docs/roadmap/items/Q4/it/002-post-scale-cost-optimization-audit-render-cloudfla.md` after all 8 above
```

## Resume cheatsheet next session

1. Open this doc and the spec file side-by-side
2. Block 4 × 6-hour founder sessions across 1 quarter (Mon-Tue Week 1, Mon-Tue Week 4) for invoice pull + report writeup + tripwire wiring
3. Pull all 14 service-row invoices for last 30 days first (mechanical, ~6 hr)
4. Then per-feature attribution (~6 hr judgment call)
5. Then optimization ranking + tripwire wiring (~12 hr)
6. Flip `shipped_at` on spec file once all 8 pass-criteria green

## Spec status reasoning

Per `STATUS-USAGE.md` enum + the spec block "Populate during first sub-agent emission cycle", the item stays `in_progress` until founder completes the quarterly audit. Engineering-hand work is complete — the doctrine, observability framework, and 5-section audit template are shipped here. The actual invoice-pulling + business decisions are founder physical-access tasks. No further code can move this forward without founder dashboard access + business judgment.

## Related items

- **R-Q4-E-004** (depends_on) — scale-readiness work; this audit becomes meaningful once scale is hit
- **U10 / U12** — credential rotation (Supabase password + Resend key) often surfaces during cost audits
- **R-Q1-IT-004** (precedent) — same handoff pattern, founder DNS access required
- **`docs/free-tier-budgets.md`** — the live ceiling table this audit reconciles against
- **`docs/operational-context.md`** — per-service deploy + key location reference
