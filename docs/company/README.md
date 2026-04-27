# Darshya virtual company — founder action sheet

> One page. Read this first. Everything else in this folder is the
> evidence trail.

## What's here

A 9-department audit of Darshya's current state, run as 9 parallel
agents on 2026-04-27. Each agent grounded its output in actual repo
files, marked fabricated data with `[ASSUMPTION]`, and stayed in its
lane. Output:

```
00-orchestrator.md   Cross-department dependencies + sequenced weekly plan
01-cto.md            Engineering audit, P0 launch blockers
02-cmo.md            Free GTM, ICP, 30-day plan, content calendar
03-cfo.md            Burn map, unit economics, fundraising artefact list
04-cpo.md            Roadmap (30/60/90), feature inventory, top-PRD
05-sales.md          Supply + demand acquisition, buyer one-pager
06-talent.md         Solo-founder time math, first-hire trigger
07-cs.md             Top complaint types, macros, churn signals
08-legal.md          DPDP, refund-policy stress test, runbook (not legal advice)
09-it.md             Observability, DR script, free-tier tripwires
```

## The 5 founder-only decisions blocking everything else

Every department surfaced one of these. Until each is called, that
department's plan stalls. Detail in `00-orchestrator.md`.

1. Incorporate or stay sole-prop?
2. Astrology surface — fix or delete?
3. NRI subscription this quarter — yes or defer?
4. First contractor hire — set the trigger metric.
5. Razorpay raw-body verification — flip after test-mode validation?

If you do nothing else, do (1) and (5).

## The single sequenced week

~30 founder-hours, in order. Each row links to the source dept doc.

| Day | What | Hrs |
|---|---|---|
| Mon AM | Call decision #1; strip the false "Pvt. Ltd." line in `refunds/page.tsx:226` if no | 1 |
| Mon PM | Kill silent mock fallback in `pujas/[slug]/book/page.tsx:549-552` (CPO §6 has full PRD) | 8 |
| Tue AM | UptimeRobot free on `/health` and the web home (IT §2) | 2 |
| Tue PM | Promote donations from in-memory Map to Prisma table (CTO P0 #2) | 4 |
| Wed | Razorpay raw-body webhook flip — validate, then set `RAZORPAY_VERIFY_RAW=true` on Render | 6 |
| Thu AM | Reddit week-1 plant-flags (CMO §2 week 1, comment-only, no asks) | 2 |
| Thu PM | DM 5 ISKCON Bengaluru priests (Sales §1 Tactic A) — goal: 1 reply by Friday | 4 |
| Fri AM | MCP env exports per `docs/mcp-setup.md`; verify with `/mcp` | 2 |
| Fri PM | Walk every signed-in role in a real browser; inventory which surfaces still mock | 1 |

## P0 launch blockers (from CTO audit)

These are real bugs in the live codebase. Don't widen the marketing
funnel until at least the first three are fixed.

1. **Razorpay webhook HMAC over `JSON.stringify`** — gated behind
   `RAZORPAY_VERIFY_RAW`, fix is one env var after test-mode validation.
   `apps/api/src/routes/payments.ts:125-139`.
2. **Donations live in an in-memory Map** — Render restarts wipe
   80G receipt traceability. `apps/api/src/routes/donations.ts:46`.
3. **`apps/admin` is a phantom** — no `app/` folder, no real build.
   Operating without an admin dashboard.
4. **Eight portal pages render hardcoded mock arrays in production** —
   list in `04-cpo.md` §1.
5. **Silent mock fallback in puja booking** — when API errors, the UI
   constructs a fake `orderId` client-side and proceeds to Razorpay.
   `apps/web/app/pujas/[slug]/book/page.tsx:549-552`.

## What we deliberately did NOT do

- No paid ads at <100 users.
- No AWS IVS wiring (4-figure surprise-bill risk).
- No mobile app launch this week.
- No NRI subscription this quarter.
- No first hire yet.
- No incorporation paperwork unless decision #1 = yes.

## Honest scope of what these docs are

- They are a **starting state snapshot** at 2026-04-27. Useful for
  ~2 weeks; stale by ~4.
- They are **grounded in repo state**, not in user research, customer
  interviews, real funding data, or live retention curves. Every
  fabricated number is tagged `[ASSUMPTION]`.
- They are **not a substitute** for: a real lawyer, a real CA, an
  actual customer interview, or live A/B testing.
- The "agents reacting in real time" loop the source article promised
  does not exist. What exists: a static cross-department dependency
  graph (`00-orchestrator.md`) + one sequenced weekly plan.

## What to do when these go stale

After ~2 weeks (or when any of the founder-only decisions has been
called), re-run the 9 agents with the same prompts but updated
context. The pattern is durable — only the contents drift.

The full agent-spawn prompt lives in this conversation's history;
copy it forward to the next session.
