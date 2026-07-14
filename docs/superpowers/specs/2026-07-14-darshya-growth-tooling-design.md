# Darshya Growth Tooling + GTM Design

**Date:** 2026-07-14
**Status:** Approved design (pending spec review → implementation plan)
**Author:** Operator-strategy pass, validated against 6-lane free-tier market research
**Forks locked:** KYC in progress this week · web + PWA first (no $124 mobile spend) · investors active now

---

## 1. Operator's read — the brutal truth

Darshya has an autonomous company engine running green on cron, 312 roadmap items executed, 72/72 security closed, prod live on Render — and **zero visitors, zero revenue, zero funnel**. This is not a product or tooling problem. It is a **distribution + activation problem**. No tool creates demand. The tools in this design accelerate one of three things: seeing the funnel (MCPs/analytics), capturing demand once it arrives (payments/PWA), or telling the story (investor artifacts). The next 60 days are about lighting a fire under the funnel; everything else is kindling.

The $0-revenue + active-investor fork reconciles one way: **you cannot raise on a dead funnel.** Investor artifacts build in parallel, but the **traction story IS the pitch** — live metrics moving from zero, even by tens, beats any deck. The autonomous-company angle is the differentiator, not the headline.

## 2. Approach — Parallel Rails (chosen)

Two tracks simultaneously, converging the day KYC keys land:

- **Track 1 (founder-facing — audience + story):** SEO foundation, PostHog funnel instrumentation, organic social engine, investor artifacts.
- **Track 2 (agent/auto — infra + rails):** payments stack (Razorpay + Stripe NRI), darshya-mcp, PWA + web push, perf/CWV hardening.

**Rejected approaches:** A (audience-first) bets 30-45 days with no revenue and may arrive at a dead cart; B (monetization-first) risks a live cart with no traffic. C (parallel rails) honors all three forks without betting on the wrong bottleneck and wastes no time.

## 3. Architecture

```
TRACK 1 — FOUNDER-FACING (audience + story)        TRACK 2 — AGENT/AUTO (infra + rails)
───────────────────────────────────────            ─────────────────────────────────────
W1 SEO: schema.org + GSC + Bing + sitemap/IndexNow  W1 Payments: Razorpay checkout + subscriptions
W1 PostHog instrumented (funnel events)              + Routes splits + webhooks (test mode)
W2 Organic social: Meta+YouTube reels + AI content  W1 darshya-mcp built (founder chat → prod data)
W3 Investor artifacts: /admin/investor + Gamma deck  W2 PWA: Serwist + manifest + OneSignal web push
W3 Founder-update cadence: GitHub reports + Substack W2 Stripe NRI route (diaspora checkout + billing)
                                                    W3 Lighthouse CI gate + R2 assets + CF Images
         ↓ CONVERGE: KYC keys land → live instrumented checkout + investor dashboard watching ↑
```

**Sequencing rule:** Track 1 starts the funnel from absolute zero. Track 2 ensures demand is not wasted when it arrives + gives the data to prove it to investors. The only "go-live" that matters is KYC-key day.

**Isolation:** each unit (darshya-mcp, /admin/investor, PostHog layer, PWA layer, payments layer) is independently testable, communicates through existing interfaces (Prisma, Next routes, Razorpay webhooks), and ships without the others. darshya-mcp reads prod but never writes. Payments code ships green and activates on key insertion.

## 4. Components

### Group 1 — Claude Code tooling (PICK MCPs; settings edits drafted for user approval)

| Component                       | Does                                                                   | Depends on                                                              | How used                                                         |
| ------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| postgres MCP (read-only role)   | SELECT against prod Supabase                                           | Read-only DB role + DIRECT_URL (not pooled)                             | Funnel drop-off joins directly in chat                           |
| github MCP (remote HTTP)        | Cross-repo search + PR/issue triage                                    | Fine-grained PAT (contents:read, issues:write, PRs:write, actions:read) | Triage 9-agent fleet GH Actions output                           |
| filesystem MCP (sandboxed)      | File ops on docs/agent-reports + apps                                  | Paths pinned at install                                                 | Bulk-manage agent reports; safe sub-agent artifact ops           |
| playwright MCP                  | Browser UI-verify (a11y-tree)                                          | Chromium (live in session)                                              | "verify before declare done" — confirm prod renders post-deploy  |
| jina / context7 / deepwiki MCPs | Keyless scrape + live docs + repo Q&A                                  | Nothing (all free)                                                      | Stop hallucinated Prisma/Stripe APIs; pull competitor pricing    |
| darshya-mcp (custom TS stdio)   | funnel_today, kpi_snapshot, agent_reports, prod_health, recent_commits | Existing Render DB + docs/agent-reports                                 | "what's my funnel today?" → grounded prod answer. $0, 4-6h build |

### Group 2 — Growth + analytics

| Component                                    | Does                                  | Free tier                         | How used                                                                                          |
| -------------------------------------------- | ------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------- |
| PostHog (Cloud)                              | Funnel + session replays + exceptions | 1M events/mo, 5K replays, no card | Events on darshan-complete, booking-intent, donation-intent. Turns dead-zero into a visible curve |
| schema.org + GSC + Bing + sitemap/IndexNow   | Rich-result SEO + indexing            | Free, unlimited                   | Event cards for "ganesh puja near me" — highest-leverage free SEO win                             |
| Organic social (Meta + YouTube + AI content) | Demand creation                       | Free tools                        | Daily aarti reels, festival countdowns — the actual fire                                          |
| Cal.com / Resend / Brevo                     | Priest onboarding + email             | Free tiers                        | Onboard priests + cold outreach to gurukuls (dead funnel needs supply + demand)                   |

### Group 3 — Retention (web-first, no mobile spend)

| Component          | Does                                 | Free tier                | How used                                                                          |
| ------------------ | ------------------------------------ | ------------------------ | --------------------------------------------------------------------------------- |
| Serwist PWA        | Installable, offline-capable web app | MIT, unlimited           | Home-screen icon + offline bhajans/calendar — mobile retention without app stores |
| OneSignal web push | Daily darshan + festival reminders   | 10k subscribers/send cap | Retention engine; segment past 10k, VAPID fallback                                |

### Group 4 — Payments (gated behind KYC, code ships green first)

| Component                                                           | Does                               | Cost                                        | Activates when                                          |
| ------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------- | ------------------------------------------------------- |
| Razorpay (Checkout + Subscriptions/UPI Autopay + Routes + webhooks) | 7 of 8 revenue lines, no take-rate | 2.36% + GST/txn (per-tx, not cash)          | KYC clears                                              |
| Stripe (NRI Checkout + Billing)                                     | Diaspora subscription/yatra        | 2.9% + 30c + 2% FX + Billing 0.5% take-rate | NRI line promoted                                       |
| 80G donation receipts                                               | Tax-deductible donations           | Free to issue                               | 80G-registered partner entity (separate legal question) |

**Per-revenue-line mapping:**

| Revenue line       | Primary payment feature                                                        | Take-rate?                       |
| ------------------ | ------------------------------------------------------------------------------ | -------------------------------- |
| Booking commission | Razorpay Checkout + Routes split (commission→Darshya, balance→priest)          | No — gateway fee only            |
| NRI subscription   | Stripe Billing (NRI cards) + Razorpay Subscriptions/UPI Autopay (India family) | Stripe Billing 0.5%; Razorpay no |
| AI Pandit          | Razorpay Checkout (credits) or Subscriptions (monthly)                         | No                               |
| Store              | Razorpay Checkout + Routes vendor split                                        | No                               |
| Donations          | Razorpay Checkout + 80G receipt webhook                                        | No (separate 80G entity)         |
| Affiliate          | Razorpay Routes commission split                                               | No                               |
| Astrology          | Razorpay Checkout + Subscriptions retainer                                     | No                               |
| Yatra              | Razorpay Checkout + Subscriptions installments + Routes operator split         | No                               |

### Group 5 — Investor artifacts (build parallel; traction story IS the pitch)

| Component                      | Does                                                           | Free tier                               | How used                                                            |
| ------------------------------ | -------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------- |
| /admin/investor route          | One gated URL: live MAU, temples, agent-runs, roadmap %shipped | $0 own code                             | "here's the live dashboard" — no screenshot friction                |
| Render metrics + PostHog embed | Proves app is live, not a deck mockup                          | Free                                    | Embed in investor route                                             |
| Gamma deck                     | AI pitch deck, PDF/PPTX export                                 | 400 one-time credits; "Gamma" watermark | Narrative: autonomous-company + NRI unit economics + traction curve |
| Google Drive data room         | Cap table, security-audit (72/72), 312-roadmap CSV, agent logs | 15GB, view-only                         | Per-investor-email access                                           |
| Founder-update cadence         | GitHub-based reports + Substack                                | Free                                    | Public traction narrative; build in public                          |

## 5. Data flow

**Flow A — the funnel instrument (the spine):**
Visitor (SEO/social) → festival/temple page (schema.org Event/Offer → Google rich result → more visitors, loop) → PostHog captures page_view → scroll → booking_intent_click → Razorpay Checkout (KYC live) → webhook → apps/api → Prisma Payment + Booking rows → PostHog captures checkout_started → payment_succeeded → Routes split commission→Darshya, balance→priest → darshya-mcp funnel_today reads Prisma → founder sees curve in chat → /admin/investor reads same Prisma + PostHog + GH Actions runs → investor sees live MAU + revenue + agent-fleet runs in one URL.

**Flow B — founder → prod data (darshya-mcp):**
Founder asks "what's my funnel today?" → darshya-mcp funnel_today runs read-only Prisma SELECT via DIRECT_URL (read-only role, never pooled URL) → returns visitors/signups/leads/paid last 7d structured → Claude renders. prod_health curls darshya.online + API; agent_reports reads docs/agent-reports/\*.md. **No writes, no secret egress.**

**Flow C — autonomous-company proof → investor (narrative):**
GitHub Actions cron → 9 ops agents run → reports to docs/agent-reports/ + commit → /admin/investor counts runs + roadmap %shipped (312 → 312−open) → Gamma deck embeds the live dashboard link + "312 roadmap items executed by an autonomous fleet" stat → Google Drive data room holds security audit + agent logs + roadmap CSV. **Deck is static; the dashboard it links to is live.** That is the $0-revenue traction story.

**Invariant:** PostHog is the only thing that turns dead-zero from invisible to visible. Every flow either feeds it (events) or reads what it + Prisma hold (darshya-mcp, investor route). Build PostHog first.

**Two flows that must NOT cross:** donation funds never commingle with operating revenue (separate ledger, 80G partner entity); darshya-mcp never routes through a pooled DB connection (CONCURRENTLY/uuid-cast bugs on record).

## 6. Error handling

| Component              | Failure mode                         | Behavior                                                                                                                |
| ---------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| darshya-mcp            | DB unreachable / role mis-scoped     | Returns "prod unreachable" + error string; never throws into chat. No writes = no corruption                            |
| PostHog                | Cloud down / event drop / over 1M/mo | Fire-and-forget captures never block UX; buffer + drop oldest if full. Funnel visibility degrades, app stays up         |
| Razorpay webhooks      | Missed/duplicate/replay              | Idempotency key = razorpay_payment_id; dedupe on Payment row existence; reject-then-retry on signature failure          |
| Razorpay Routes splits | Priest payout fails                  | Booking marked payout_pending; commission not credited until settlement confirmed; surfaced in darshya-mcp kpi_snapshot |
| OneSignal              | 10k subscribers/send cap hit         | Segment sends; critical alerts fall back to self-hosted VAPID web-push                                                  |
| /admin/investor route  | PostHog/GH API down                  | Each panel independent try/catch; partial render beats blank; cache last-good 5 min                                     |
| Stripe NRI             | FX/cross-border decline              | Fallback "try Razorpay for India-based payment"; NRI is opt-in, not default                                             |
| 80G receipts           | Partner entity cert lapsed           | Block tax-deductibility claim in UI; donations still process, just without 80G receipt                                  |

## 7. Testing

- **High-risk (payment money flows):** full TDD. Webhook idempotency, Routes split math, 80G receipt generation — unit tests first, then Razorpay test-mode integration before live keys. Never declare payments green from a summary; curl the test webhook + read the Payment row.
- **Medium-risk (data exposure):** darshya-mcp unit tests against seeded local Postgres (same schema, not prod). Verify read-only role can't write (a DELETE test that must fail). Verify no pooled-URL path exists.
- **Low-risk (additive wrappers):** PostHog captures, schema.org tags, PWA manifest — smoke tests + Lighthouse CI gate on LCP/CLS/INP + SEO score per deploy.
- **Investor artifacts:** /admin/investor gets an e2e (Playwright MCP) — unauthenticated must 401, authenticated must render all panels. Deck + data room reviewed by user, not tested.

**Verification gate (non-negotiable):**

- Payments: curl Razorpay test webhook → read Payment row in Postgres MCP → confirm idempotency → only then insert live keys.
- darshya-mcp: run funnel_today against seeded local DB → assert structured return + no-write enforcement.
- PWA: Lighthouse PWA-score + manual install-to-home-screen via Playwright.
- Funnel live: PostHog session replay of a real booking → confirm event chain fired.
- Investor route: Playwright load unauthenticated + authenticated.

**Two non-negotiables:** (1) no component silently swallows a money-flow failure — surfaced in darshya-mcp or PostHog or it didn't happen; (2) nothing declares green/live/shipped from a summary field — curl the prod URL, read the row, run the suite.

## 8. Sequencing — 14-day plan

```
DAY 1-3   T1: PostHog wired + schema.org tags on temple/festival pages
          T2: MCP settings draft for approval + darshya-mcp build
DAY 4-6   T1: GSC + Bing verified, sitemap + IndexNow live, first festival reel
          T2: Razorpay checkout + subscriptions + Routes + webhooks in test mode
DAY 7-9   T1: Serwist PWA + OneSignal web push
          T2: Stripe NRI route, Lighthouse CI gate, R2 static assets
DAY 10-12 T1: /admin/investor route, Gamma deck, Google Drive data room
          T2: KYC keys land → test→live swap → curl test webhook → confirm Payment row → activate. CONVERGE.
DAY 13-14 T1: Founder-update #1 (GitHub + Substack) with first real funnel numbers; share investor route + deck
          T2: PostHog session replay of first real booking; verify event chain
```

KYC-key day is the only hard gate. Everything before it ships green and waits at $0 revenue.

## 9. Free-tier budget ledger

| Tool                         | Free tier                         | Ceiling / risk                          |
| ---------------------------- | --------------------------------- | --------------------------------------- |
| PostHog Cloud                | 1M events/mo, 5K replays, no card | Drops oldest over cap; resets monthly   |
| Google Search Console + Bing | Unlimited                         | None                                    |
| IndexNow                     | Free, keyless                     | None                                    |
| Serwist PWA                  | MIT, unlimited                    | None                                    |
| OneSignal web push           | 10k subscribers/send              | Segment past 10k; VAPID fallback        |
| Cloudflare CDN + R2          | R2 10GB + zero egress             | 10GB = thousands of optimized images    |
| Cloudflare Images            | 5k transforms/mo                  | Tight for big catalog; dedupe via cache |
| Render (web+api)             | 750h/mo, sleeps on idle           | CF CDN masks cold starts                |
| Razorpay                     | 2.36% + GST/txn (take-rate)       | Per-transaction, not upfront cash       |
| Stripe (NRI)                 | 2.9% + 30c + 2% FX + Billing 0.5% | NRI line only                           |
| Gamma deck                   | 400 one-time credits              | "Gamma" watermark (removable at share)  |
| Google Drive                 | 15GB                              | View-only per investor                  |
| Resend / Brevo / Cal.com     | Free tiers                        | Resend 3k/mo, Brevo 300/day             |
| All PICK MCPs                | Free / open-source                | github 5k req/hr                        |
| darshya-mcp                  | $0 (local)                        | None                                    |

**Total cash outlay to first revenue: $0.** Razorpay/Stripe are per-transaction take-rates, not upfront spend. Only future cash fork is mobile ($124) — explicitly deferred.

## 10. YAGNI cuts (explicitly NOT doing)

- Smithery / Composio — not distributing/selling a tool
- Beautiful.ai / DocSend — no free plan (14-day trials only)
- next-pwa — stale (Dec 2022, no app-router); use Serwist
- Cloudflare Pages — abandoned for Darshya (next-on-pages dead)
- Mobile app-store spend ($124) — deferred per fork
- Sentry — maybe-later; only if founder commits to SDK wiring
- Buffer / Umami / WhatsApp-AiSensy — maybe-later; only if organic + email prove insufficient

Every cut frees focus for the funnel.

## 11. Research provenance

Validated via a 6-lane parallel research sweep (27 agents, ~2.1M subagent tokens, 2026-07-14) covering: client-side MCPs, server-side/custom MCPs, growth/audience tools, investor artifacts, web/PWA/SEO tooling, payments/monetization. Each pick adversarially verified for true free-tier fitness (not trial/credit-walled/deprecated) and Darshya fit. Full lane transcripts retained in the session workflow directory.
