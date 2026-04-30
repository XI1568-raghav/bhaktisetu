# 00 — Master orchestrator

> Read this **after** the 9 department docs (`01-cto.md` through `09-it.md`).
> This file is the cross-department layer: where one department's decision
> forces another's hand, what the founder alone must call, and the single
> sequenced plan the company actually runs against this week.

---

## The 5 founder-only decisions blocking everything else

These cannot be delegated. Every department doc surfaced one of them. Until each is called, the corresponding department's plan stalls.

| # | Decision | Blocks | Default if not called |
|---|---|---|---|
| 1 | **Incorporate or stay sole-prop?** | Legal §1 — liability shield. CFO §5 — fundraising artefacts. Sales §3 — buyer one-pager identity. CMO — copy on `lib/company.ts`. | Stay sole-prop another 30 days. Cost: keep operating with personal liability + remove the fabricated "Pvt. Ltd." string from `refunds/page.tsx:226` (legal §2a). |
| 2 | **Astrology — fix or delete?** | CPO Bet C. CMO content calendar. Sales (would lose a vertical from the buyer pitch). | Delete the surface for now (~2h work) and re-introduce only if a real astrologer signs up. |
| 3 | **NRI subscription this quarter?** | CPO Bet B. CFO unit-economics math (NRI is 9-10× domestic per puja). Sales NRI angle. | Defer. Live with per-puja only; revisit at Day-60 if NRI Day-30 retention < 25% (the steelman tripwire). |
| 4 | **First contractor hire trigger** | Talent §5. CS routing rules (founder is currently the only escalation path). | Wait until any of: 50 paying bookings/wk, support response > 2 h, or moderation backlog > 15 h/wk. Talent doc has the JD ready. |
| 5 | **Razorpay raw-body verification flip** | Security pass row 1. CTO P0 #1. | Stays at `false` (legacy path) until founder runs the test-mode webhook procedure in `docs/razorpay-webhook-test.md`. Single env var, single rollback. |

If you flip nothing else this week, flip #1 and #5. Those have the highest ratio of (downside avoided ÷ effort).

---

## Cross-department dependency map

A change in one row forces moves in the rows below. This is the answer to the article's "if Finance sees X, Marketing reacts" — it's not real-time, but it is the static dependency graph.

```
Founder Decision #1 (Incorporate)
  → Legal §5 unblocks (open Current Account, NDA template, priest contracts)
  → CFO §5 unblocks (artefact list moves from 4 blockers to 1)
  → CMO copy gate flips (operatedByLine() returns the entity name)
  → Sales one-pager gets a real "From:" line

Founder Decision #5 (Webhook flip)
  → CTO P0 #1 cleared
  → CFO Tripwire #3 (Razorpay payouts > ₹50K escrow) becomes detectable
  → CS routing keyword "payment deducted, booking not confirmed" reduces in volume

CMO Week-1 plant-flags activity → Supply must already be true
  → Sales §2 demand preconditions: 8+ priests live, video proof tested
  → CTO P0 #2 (donations in-memory) and #3 (admin phantom) gate the moderation flow
  → Talent §3 force the founder to claim 8h/wk for support in week 1

CPO #1 (Kill silent mock fallback in book/page.tsx:549) → 8h
  → CFO unit economics get real (mocked orders never paid)
  → CS macro #3 ("payment deducted, booking not confirmed") drops to near-zero
  → Sales traction graph stops being noise

IT Disaster #1 (Render hibernation) → fired by daily cron already
  → CMO Week-1 day-1 reach must factor the 30s cold-start
  → CS first-response window assumes the API is awake
```

---

## The single sequenced plan (this week, in order)

Pulled across departments. If you do exactly this in order, every department's top-priority item moves forward. Total: ~24-30 founder-hours.

| Day | Hours | What | Source dept |
|---|---|---|---|
| Mon AM | 1h | Decide #1 (incorporate yes/no this quarter). If no — strip "Darshya Technologies Pvt. Ltd." from `refunds/page.tsx:226` and ship. | Legal §2a |
| Mon PM | 8h | **Kill silent mock fallback** in `apps/web/app/pujas/[slug]/book/page.tsx:549-552`. Full PRD already in CPO §6. Test live booking end-to-end. | CPO #1 |
| Tue AM | 2h | Set up **UptimeRobot** (free, 50 monitors, 5-min interval) on `https://api.darshya.online/health` + `https://darshya.online`. SMS your phone on red. | IT §2 |
| Tue PM | 4h | Promote donations from in-memory `Map` to a Prisma `Donation` table. Migration + reroute `donations.ts:46`. | CTO P0 #2 |
| Wed | 6h | **Razorpay test-mode webhook flip**. Procedure in `docs/razorpay-webhook-test.md`. Validate, then set `RAZORPAY_VERIFY_RAW=true` on Render. | Security row 1 |
| Thu AM | 2h | Plant flags week-1: Reddit r/hinduism + r/india_speaks comment-only, no asks. CMO templates ready in §2 week 1. | CMO Week 1 |
| Thu PM | 4h | DM 5 ISKCON Bengaluru priests using Sales §1 Tactic-A template. Goal: 1 reply by Friday. | Sales §1 |
| Fri AM | 2h | Sentry MCP + Postgres MCP env-var setup (export from `apps/api/.env` per `docs/mcp-setup.md`). Verify with `/mcp`. | IT §2 |
| Fri PM | 1h | Open the live site in a real browser. Walk every signed-in role. Note the surfaces still showing mock data (CPO §5 list). Don't fix yet — just inventory. | CTO §6, CPO §5 |

Total: ~30 hours of founder time, spread across one week. Everything else this week is reactive — support tickets, Reddit replies, code review on AI-generated PRs.

---

## What we are deliberately not doing this week

Each of these came up in a department doc and was explicitly downranked:

- **No paid ads** (CMO §6) — wastes solo-founder time at <100 users.
- **No AWS IVS livestream wiring** (CFO §6 tripwire) — 4-figure surprise bill risk; YouTube embeds + scheduled-only mode is fine until monetisation path exists.
- **No mobile app push** (CPO 60-day, gated). Phase 1 ready to start, but not this week — too many surfaces still mocked.
- **No NRI subscription product** (CPO Bet B, gated on Decision #3).
- **No talent hire** (Talent §5, gated on the 3 trigger metrics).
- **No legal incorporation if Decision #1 = no** — but the proxy actions in Legal §5 (separate bank, written priest contracts) still happen this month.

---

## Weekly rhythm — what to read and when

Every Monday morning, ~20 minutes:

1. `docs/launch-state.md` — has anything moved?
2. This file (`docs/company/00-orchestrator.md`) — are any of the 5 founder decisions ripe?
3. UptimeRobot dashboard — was the API up all week?
4. Sentry — top 3 errors by count.
5. Render logs filtered on `auth.geo` — any new countries hitting auth?

If all five are green or unchanged, that's the week's review done. Spend the rest on the sequenced plan above.

---

## What the agents collectively did NOT cover

These are gaps, not failures — agents were told to flag rather than fabricate.

- **No real ICP interviews**. CMO segments are inferred from public Reddit/forum activity, not user research. Replace after first 10 paying users.
- **No real competitor pricing data**. Sales §4 used my domain knowledge, not Firecrawl scrapes. Tightens once Firecrawl MCP gets a key.
- **No real perf data**. CTO §4 is mostly `[UNKNOWN]`. The 3-line preHandler logger is the cheap fix.
- **No real cohort retention curve**. CFO Day-30 / Day-60 numbers are placeholders. Real numbers exist after 8 weeks of signups.
- **No real lawyer review**. Legal doc is a layperson reading public statutes. Items only a real lawyer can answer are listed at the bottom of `08-legal.md`.

These gaps are why the next round of "department" work has to wait for live data. Running 9 agents again next week without that data produces the same docs.

---

## How this maps to the article's "Master Orchestrator" claim

The article promises agents that react to each other in real time. That's not what we have. What we have:

- **Static dependency graph** (the box above) — captures what depends on what.
- **Single sequenced plan** — captures what the founder does this week.
- **5 founder-only decisions** — captures what no agent can decide.
- **Department docs** — capture each function's view, grounded in repo state.

Real-time orchestration is a fiction at this stage. Sequential execution against a clear plan is what actually ships.
