# Tasks — Darshya

> Live ledger. History → `docs/handoff.md`. Completed log → `docs/tasks-history.md`. User gates → `docs/activation-gates.md`. Last: 2026-05-27.

## In progress

- (nothing — overnight batch shipped 2026-05-27: referrals MVP + 4 new agents + dynamic OG + lighthouse cron + email capture. See HANDOFF block below.)

## HANDOFF 2026-05-27 (overnight autonomous batch)

**Shipped (unattended, per "go ahead in the roadmap" directive):**

1. **Referrals MVP** — `apps/api/src/routes/referrals.ts` registered at `/api/v1/referrals/*`. Defensive DDL replay in `ensure-schema.ts` so Render reboot self-heals (ReferralClaimStatus enum, referral_codes + referral_claims tables, FKs, indexes — all `pg_constraint`-guarded idempotent).
2. **Web /refer page** — authenticated UI with code + share buttons (WhatsApp/X/FB/Telegram/Email) + stats. Anon visitors see email-capture fallback (`source=refer-anon`). `runtime = 'edge'`.
3. **ReferralCapture** — global mount in `app/layout.tsx`. Cookie capture `?ref=CODE` → `darshya_ref` (30d, SameSite=Lax). Auto-claim POST on auth, dedup via `darshya_ref_claimed` localStorage flag. Demo tokens skipped.
4. **4 new fleet agents** (auto-discovered by `/admin/agents`):
   - `broken-link` — crawls 10 seed pages, HEAD 200 internal links, classifies OK/SLOW/BROKEN.
   - `gsc-submitter` — Google sitemap ping + Bing IndexNow (requires `INDEXNOW_KEY`).
   - `founder-tweet-draft` — 12-festival calendar, 5 templates, days-until-next-festival.
   - `content-publisher` — 15-keyword rotation, writes daily MDX draft to `docs/agent-reports/blog-drafts/`. Skip-overwrite if human edited.
5. **Dynamic OG images** — `/og/puja/[slug]` + `/og/temple/[slug]` edge routes. Saffron/amber gradient cards. Puja/temple metadata picks dynamic OG as final fallback after explicit assets.
6. **Lighthouse weekly cron** — `.github/workflows/lighthouse-weekly.yml`. Monday 04:00 UTC. 9 URLs × desktop single-run. Markdown table to `docs/agent-reports/YYYY-MM-DD-lighthouse.md`. ~12 min/month of 2000 ceiling.
7. **EmailCapture component** — POST `/waitlist` source-tagged. Mounted on `/nri` (`nri-landing`), home page (`home-hero`), `/refer` anon fallback (`refer-anon`).
8. **Shareable shloka-card generator** (`/shloka-card`) — viral feature from CEO doc Day 31-60. Live OG preview, download + WhatsApp/X/FB share with `utm_source=shloka-card`. 3 starter presets. Linked from `/shlokas` index. PostHog events fire on copy/download/share. Sitemap entry added.
9. **Brand-default OG card** (`/og/default`) — edge ImageResponse, replaces 11 references to the missing `/og-default.png` static file across home, layout, store, shlokas, ask-pandit, auth, contact, about. All site-wide previews now render.
10. **ProductHunt launch page** (`/launch`) — hero + 6 feature cards + NRI lane with email capture + founder note + final CTA. Ready for PH submission. Sitemap entry added.
11. **daily-cron workflow soft-fail** — exits 0 with `::warning::` instead of red ❌ when `CRON_AUTH_TOKEN`/`API_BASE_URL` absent. Stops the daily failure email; user-pending gate U18 still tracked.
12. **Public agent feed** (`/updates` web + `GET /api/v1/public/agents/feed` API) — Sri Mandir-grade build-in-public surface. Lists 12 most-recent reports with title + 600-char excerpt + GH source link. Revalidates every 30 min. Sitemap entry added.

**User-pending (priority order):**

- **U18** `CRON_AUTH_TOKEN` GH secret — daily-cron workflow exits 1 at precheck until set.
- **U19 (new)** `INDEXNOW_KEY` GH secret + host key file at `darshya.online/<key>.txt` — gsc-submitter Bing ping noop without it (Google ping still works).
- **Rotate Resend key** `re_***REMOVED***` — leaked earlier this week.
- **U16** flip CF Pages `NEXT_PUBLIC_KNOWLEDGE_ENABLED=true` + `NEXT_PUBLIC_GURUKUL_ENABLED=true` then rebuild.
- **U1-U15** activation gates → `docs/activation-gates.md`.

## Pending — engineering

| # | Task | Notes |
|---|---|---|
| E2 | Wire FCM server key on user paste | env-or-noop, user-paste required |
| E9 | TODO(W8): embedded Stripe Elements | clientSecret-only fallback (mirrors pujas page gap) |
| E10 | `getPublicPriests({ specialization?, deity? })` server-side filter | API enhancement, client-side filter works for now |

## Pending — user-action

→ `docs/activation-gates.md` (U1-U15).

**U16 (new):** Flip Cloudflare Pages env vars `NEXT_PUBLIC_KNOWLEDGE_ENABLED=true` and `NEXT_PUBLIC_GURUKUL_ENABLED=true`, then rebuild. (Optional: `KNOWLEDGE_CONTENT_DIR` on Render if API container ships MDX.)

**U17 DONE 2026-05-27** — secrets set, default branch flipped main, fleet verified green (c4a1495, 6 reports).

**U18 (new):** Set `CRON_AUTH_TOKEN` GH secret (matching Render env) so daily-cron workflow stops failing. If not set in Render either: generate `openssl rand -hex 32` + set both places. Currently daily-cron exits 1 at precheck.

**Prod migrations applied 2026-05-25** via `prisma db execute` against poojly Supabase. Verified via `apps/api/scripts/check-prod-tables.mjs` — 11/11 tables, 28/28 columns, 6/6 FKs. 7 total shipped now (5 prior + 3 fresh: lessons/streaks/badges + 2 gurukul migrations).

## Recently completed (top 5)

| Date | Task | Commit |
|---|---|---|
| 2026-05-27 | feat: overnight batch — referrals MVP + 4 new agents + dynamic OG + lighthouse cron + email capture + shloka-card generator + /og/default + /launch + daily-cron soft-fail | pending |
| 2026-05-27 | feat: agent fleet (9 agents) + CEO roadmap + /admin/agents + 3 GH workflows | pending |
| 2026-05-26 | feat(mobile): gurukul owner parity — become-gurukul + portal screens (89/89 smoke) | `d170b39` |
| 2026-05-25 | feat: sample gurukul seed + admin moderation + signin fix | pending |
| 2026-05-25 | feat: knowledge hub + gurukul marketplace + admissions (188 files, 3 migrations applied to prod) | `bda6a0b` |
| 2026-05-21 | docs(caveats): every dynamic route needs `runtime = 'edge'` for CF Pages | `d63d660` |
| 2026-05-21 | fix(web): edge runtime on `/pandits/[id]` + `/pujas/pandits/[id]` → CF Pages green | `f948e0d` |
| 2026-05-21 | docs/operational-context.md — every service + key + deploy mechanism | `1ec7745` |
| 2026-05-21 | W1-W8 bundle shipped + 4 prod migrations applied + verified (5 tbl/14 col/6 FK) | `c9d9288` |
| 2026-05-20 | W6-W8: E7 BE bundle + home-puja grids + dual-currency offering checkout | (in c9d9288) |
| 2026-05-20 | W1-W5: admin fix + 4 P0 + 4 P1 endpoints + booking checkout + pujas merge | (in c9d9288) |
| 2026-05-20 | Real-numbers admin + pandit puja chain | (in c9d9288) |
| 2026-05-19 | Auth-cascade fix + gaushala donations real API | `9e87aca` |
