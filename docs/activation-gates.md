# User-action activation gates — Darshya

> Single source of truth. ROADMAP.md + TASKS.md reference this file.
> Last updated: 2026-05-17. **Corrected 2026-09-02 (`OPS-10`)** — see banner below.

> **Correction 2026-09-02 (`OPS-10`).** This table is described above as the *single
> source of truth* for activation gates, and other files reference it, so two stale
> premises in it were doing real damage:
>
> | Claim in this table | Reality, read out of this repo on 2026-09-02 |
> |---|---|
> | **U2 — "Stripe NRI KYC"** unblocks NRI payments | **Stripe was removed from the codebase on 2026-08-11.** Every remaining mention in `apps/api/src` is a removal note (`lib/env.ts:45-46`, `services/payment.service.ts:2506-2517`, `routes/payments.ts:304`, `routes/subscriptions.ts:274`). There is no Stripe integration left to activate. Razorpay is the only live rail and it settles **INR only**. **No replacement international processor has been chosen** — so this is not a KYC gate any more, it is an undecided product/commercial question for the owner. |
> | Paste env vars **"to CF Pages"** (U6, U8, U16) | Cloudflare Pages has not served the web tier since the 2026-07-08 cutover (`cf-kill-zombie.yml`, `docs/render-web-cutover-runbook.md`). There is no Pages project to paste into. The web tier is the Render Docker service `darshya-web` (`srv-d970l2ks728c738fc33g`, `region: oregon`, `render.yaml:52-60`); Cloudflare is DNS + edge proxy only. `NEXT_PUBLIC_*` vars are baked at **build** time, and `autoDeploy: false` (`render.yaml:60`) means a push deploys nothing — dispatch a deploy per `docs/runbooks/prod-rollback.md`. |

These gates block live activation. Each requires user action (KYC, paid signup, env paste) — agents can't unblock. Code is shipped + env-or-noop on every integration.

| # | Gate | What user must do | Blocker for | Runbook |
|---|---|---|---|---|
| U1 | Razorpay live KYC | Submit business docs in Razorpay dashboard | Domestic real payments | — |
| U2 | ~~Stripe NRI KYC~~ — **gate void, owner decision required** `[verify — Stripe was removed 2026-08-11; the NRI rail is undecided]` | Decide whether to have an international rail at all, and which processor. There is no Stripe integration left to KYC into. | NRI real payments (blocked on a product decision, not on paperwork) | — |
| U3 | Apple Developer Program ($99/yr) | Pay + enroll | iOS build, App Store | — |
| U4 | Google Play Console ($25) | Pay + signup | Play Store APK | — |
| U5 | FCM server key | Firebase project + paste `FCM_SERVER_KEY` to Render | Native push live | `docs/env-vars.md` |
| U6 | Sentry DSN | Paste `NEXT_PUBLIC_SENTRY_DSN` to the Render web service `darshya-web` (build env) + `SENTRY_DSN` to the Render API, then dispatch a deploy — *was "to CF Pages"; corrected 2026-09-02 (`OPS-10`)* | Error capture in prod | `docs/cf-pages-env-wiring-2026-05-13.md` (historical — read its own correction banner first) |
| U7 | WhatsApp Meta Cloud API | Business verification | Outbound WA blasts | — |
| U8 | PostHog project key | Paste `NEXT_PUBLIC_POSTHOG_KEY` to the Render web service `darshya-web` (build env), then dispatch a deploy — *was "to CF Pages"; corrected 2026-09-02 (`OPS-10`)* | Funnel dashboards | Same runbook as U6 |
| U9 | Affiliate programs | Sign up Amazon/Flipkart/MMT (yatra) | Commission revenue | — |
| U10 | Supabase password rotation | Reset + update Render `DATABASE_URL` | Security hygiene | `docs/security-rotation-2026-05-13.md` |
| U11 | Unset `ALLOW_DEMO_TOKENS` | Render env → delete after investor demos | Prod auth hardening | Same as U10 |
| U12 | Rotate Resend API key | Old key leaked — generate new, paste to Render | Email security | Same as U10 |
| U13 | Demo MP4 capture run | Install ffmpeg + Playwright Chromium; `bash scripts/build-demo-video.sh` | Razorpay + Meta KYC + investor outreach — *"Stripe" removed here 2026-09-02 (`OPS-10`); there is no Stripe KYC to serve* | `docs/demo-video-recipe-2026-05-13.md` |
| U14 | `REDIS_URL` paste from Upstash free tier | Sign up + paste | Cache activation (optional) | — |
| U15 | `ALLOW_DEMO_PAYMENTS=true` until U1 | Render env — set to keep API alive | API boot in prod | — |
| U16 | Flip `NEXT_PUBLIC_KNOWLEDGE_ENABLED=true` + `NEXT_PUBLIC_GURUKUL_ENABLED=true` on the Render web service `darshya-web`, then rebuild — *was "on CF Pages"; corrected 2026-09-02 (`OPS-10`)* | Render build env vars + a dispatched deploy (`autoDeploy: false`) | Surfaces Knowledge Hub + Gurukul Marketplace nav | `docs/handoff.md` 2026-05-25 |
