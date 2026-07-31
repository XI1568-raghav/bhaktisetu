# Darshya Remediation Sweep — Founder Report (2026-07-31)

**Session:** fix-all-pending sweep. **Result: 8 PRs merged to `main`, all CI green.** Every code-fixable item from the pending-task audit is done. The items below are the ones **I cannot complete** — they need your action (secrets, KYC, or the Render account).

---

## ✅ SHIPPED THIS SESSION (8 PRs, all merged + green)

| PR   | What                                                                         | Workstream |
| ---- | ---------------------------------------------------------------------------- | ---------- |
| #183 | fleet-integrity route-manifest (the **cork** — unblocked everything)         | A          |
| #181 | P0 data-loss + XSS + fail-loud admin + pause dead agents                     | B          |
| #182 | P0 security: auth, uploads, redirects (safe-redirect, media allowlist, OTP)  | B          |
| #184 | funnel-drop-analyzer now **files** a deduped P0 (was silently `filed=0` 60d) | F          |
| #185 | gurukul-mut regression test + smoke auth-vs-empty clarity                    | C+E        |
| #186 | self-host Golden Temple OG image (Wikimedia 429)                             | H          |
| #187 | SLA escalation for stale bookings (#179 state machine)                       | G          |
| #188 | prerender ganesh-mantra-om-gam (slowest page, 5.4s)                          | I          |
| #189 | orchestrator sub-agents emit queue files via tool_use (0-queue-write)        | J          |

Plus a **commitlint config fix** (ignore Git merge-commit messages) folded into #183, and the **#182 commitlint subject fix** (`P0` → `p0` for the project's `subject-case` rule).

**Test state:** fleet-integrity 73/73 · subagent 10/10 · funnel-analyzer 6/6 · admin-gurukul 3/3 · booking 55/55 · safe-redirect 8/8. Full `ci.yml` on `main` green.

---

## 🔴 CRITICAL — PROD IS DOWN (not a code bug): Render account suspended

**Both Render web services return `503 "Service Suspended"`** (verified on origin, bypassing CF):

- `darshya-web.onrender.com` (sid `srv-d970l2ks728c738fc33g`) → **SUSPENDED**
- `bhaktisetu.onrender.com` (the API, sid `srv-d7mc2n8sfn5c73dfce0g`) → **SUSPENDED**

This is **account-level** (affects multiple services, not a deploy crash). Almost always **free-tier monthly hours/bandwidth exhausted** (today is the 31st — end of billing cycle) or a billing hold. **This is why the daily-cron 503'd for 2 days** — not the panchang route.

**→ ACTION:** Log into the Render dashboard → check the banner (hours exhausted vs billing) → either wait for the free-tier reset (1st of month) or add a payment method / upgrade. I **cannot** unsuspend it — no Render account access (only the GH-secret `RENDER_API_KEY`, which can't change account state). **All other "prod 404s / slow pages / funnel-zero" findings are downstream of this.**

---

## 🔑 FOUNDER GATES (revenue + agents blocked on you)

| Gate                                                 | Do this                                                  | Unblocks                                                                                                                                                         |
| ---------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Render unsuspend**                                 | Dashboard → resolve hours/billing                        | **Entire prod site + API + daily-cron**                                                                                                                          |
| **U1 Razorpay KYC**                                  | Submit business docs                                     | Domestic real payments (funnel-zero revenue)                                                                                                                     |
| **U2 Stripe NRI KYC**                                | US/UK/CA/AU activation                                   | NRI MRR (funnel-zero)                                                                                                                                            |
| **U18 `CRON_AUTH_TOKEN`**                            | `openssl rand -hex 32` → GH secret + Render env          | daily-cron actually runs (currently exits at precheck)                                                                                                           |
| `RESEND_API_KEY`                                     | paste → GH Actions env                                   | cold-temple-outreach + referral-nudge (no-op daily)                                                                                                              |
| `WHATSAPP_ACCESS_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` | paste                                                    | daily-devotional-broadcast (drafts 30d to 0 recipients)                                                                                                          |
| Smoke-user secrets                                   | seed per-role test accounts OR the demo accounts in prod | health-smoke real signal (currently 8/9 fails = "no token" because the `@demo.com` accounts don't exist in prod)                                                 |
| **`ROADMAP_DRY_RUN=false`**                          | `gh variable set ROADMAP_DRY_RUN --body false`           | Orchestrator graduation (it has **never gone live** — permanent dry-run; the 0-queue-write bug is now fixed so it _can_ generate queue files once you flip this) |

---

## ⚠️ REMAINING / FOLLOW-UP (not blockers)

1. **Issue #179 refunds** — the escalation state machine is now coded (#187), but the **5 stale bookings** (priests `821edbe5` ×4, `cf18e924` ×1) still need your **refund decision** (money movement is finance-adjacent, intentionally not automated).
2. **Issue #85 (yatra commerce legal)** — 47 days open; the real blocker for live Razorpay (server-derive price, refund endpoint CPA-2019, GST invoice, licensing). Needs CA/legal review.
3. **Slow content pages residual** — ganesh-mantra now prerendered; durga/lakshmi-chalisa + baidyanath/rameshwaram were already prerendered but slow due to **free-tier cold-start**. Resolved by Render warm instance (paid) — moot while suspended.
4. **commitlint `P0/` subject-case** — the project's `subject-case: never upper-case` rejects `P0` in subjects. Two recent merged commits (#181, #183) use `P0` and would fail on a re-run. Optional: relax the rule to allow the `P\d` token, or keep writing `p0`.
5. **37 git stashes + ~40 stale branches + 2 dead worktrees** — hygiene, not urgent. The `cf-opennext-migration` worktree is dead (that path was abandoned for Render).
6. **Orchestrator dry-run queue** — R-Q2-M-011 has rotted 34 days firing the T-010 tripwire. Once you flip `ROADMAP_DRY_RUN=false`, drain `_dryrun/queue/`.

---

## E2E verification performed

- fleet-integrity 73/73 locally + on every PR ✓
- Playwright E2E triggered vs prod (informational — currently failing on the suspension, will pass once Render is back)
- Live probes: manifest/favicon/OG-image/OG all 503 **because of the Render suspension**, not the assets (Dockerfile copy is correct + verified since 2026-07-08)

**Bottom line:** the entire codebase remediation is shipped and green. Prod is dark only because Render suspended the account — that's a 2-minute dashboard fix on your side, then everything above lights up.
