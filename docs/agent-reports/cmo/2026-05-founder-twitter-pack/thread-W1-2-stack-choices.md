---
hook: "Stack we picked for Bhaktisetu and why. Built for solo-founder velocity + free-tier survival until ₹10L MRR. Thread for builders. 1/9"
tweet_count: 9
topic: stack-choices
target_audience: generic
cta: "Source-of-truth doc lives at bhaktisetu.com/about — replies open for stack qs."
schedule_week: 1
schedule_day_hint: "Wed 9am IST (Tue 8:30pm PT)"
status: ready-for-founder-review
created_by: cmo-agent
---

1/9 Stack we picked for Bhaktisetu and why. Built for solo-founder velocity + free-tier survival until ₹10L MRR. Thread for builders. <!-- 134/280 -->

2/9 Frontend: Next 15 (App Router) on Cloudflare Pages. Free 500 builds/month, edge runtime, global CDN. Caveat: 3 MiB worker bundle cap forces discipline.

> **DO NOT POST AS WRITTEN — corrected 2026-09-02 (`OPS-10`).** The bundle cap in this very tweet is what killed the plan: the OpenNext bundle was 5.3 MiB gzip against a 3 MiB limit, and the web tier moved to a Render Docker service (`region: oregon`, `render.yaml:56`) on 2026-07-08. Cloudflare is DNS + edge proxy only. Publishing this would state a false stack publicly. We learned this the hard way at build #487. <!-- 209/280 -->

3/9 Backend: Fastify 5 on Render free tier (750 hr/month, exactly one always-on instance). REST over /api/v1/*. No GraphQL — solo founder, no team to enforce schema discipline, REST is forgiving. <!-- 207/280 -->

4/9 DB: Supabase Postgres (500 MB free). Prisma ORM. Migrations via prisma db execute against the direct URL. The pooled URL silently swallows DDL — that bug cost me a weekend. <!-- 188/280 -->

5/9 Payments: Razorpay for INR, Stripe for USD (NRI). Both env-or-noop so a missing key never crashes prod — the booking falls back to a mailto. Graceful degradation is the whole game on free tier. <!-- 211/280 -->

6/9 Email: Resend 100/day free. WhatsApp via Meta Cloud API — 1000/month free, perfect for booking confirmations + video proof delivery. We treat WA as the primary channel, email as the backup. <!-- 207/280 -->

7/9 Mobile: Expo 50 (React Native). Same TypeScript types as web via packages/shared. One auth flow, one money formatter, one booking-number generator. Solo founder cannot afford two truths. <!-- 207/280 -->

8/9 Agent fleet: 28 daily GitHub Actions cron jobs writing markdown reports to docs/agent-reports/. Watchdogs (uptime, broken-link, schema-validator), growth (keyword-rank, backlinks), and ops (founder-tweet-draft → this thread). <!-- 252/280 -->

9/9 The throughline: every component must fit free tier OR have a tripwire that pages me before it bills. ₹0 infra until we hit revenue that justifies the line item. Replies open for any stack q. <!-- 213/280 -->
