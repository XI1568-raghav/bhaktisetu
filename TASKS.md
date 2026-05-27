# Tasks — Darshya

> Live ledger. History → `docs/handoff.md`. Completed log → `docs/tasks-history.md`. User gates → `docs/activation-gates.md`. Last: 2026-05-27.

## In progress

- (nothing — P10-P14 batch shipped 2026-05-27 evening: /aarti + /chalisa + /deity mantras subpage + 15 cities + 20 festivals + /today daily hub + 2 new agents + markdown render upgrade. See HANDOFF P10-P14 block below.)

## HANDOFF 2026-05-27 (P10-P14 autonomous batch — pushed 5b91a52 + ab9a8e2 + 919862b)

**Shipped (unattended, per "complete last pending item and complete p10-14 end to end"):**

1. **P10 /aarti + /chalisa + /deity/[slug]/mantras** (5b91a52)
   - `/aarti` index + `/aarti/[slug]` — full aarti collection w/ Sanskrit, transliteration, meaning. Article JSON-LD.
   - `/chalisa` index + `/chalisa/[slug]` — chalisa verse collection w/ benefits.
   - `/deity/[slug]/mantras` — per-deity mantra subpage. Beej/gayatri/moola/panchakshari etc, with how-to-recite + cross-links to aarti/chalisa/shlokas. Conditional link from /deity/[slug] when mantraCount > 0.
   - Sitemap/robots/footer updated. Edge runtime + revalidate 86400.
2. **P11 city + festival expansion** (ab9a8e2)
   - Cities: 10 → 25 (added Kolkata, Chennai, Bengaluru, Hyderabad, Pune, Ahmedabad, Jaipur, Mathura, Vrindavan, Shirdi, Amritsar, Guruvayur, Madurai, Rameswaram, Gaya).
   - Festivals: 10 → 30 (added Makar Sankranti, Vasant Panchami, Maha Kumbh, Akshaya Tritiya, Narasimha Jayanti, Rath Yatra, Guru Poornima, Nag Panchami, Raksha Bandhan, Onam, Pitru Paksha, Dussehra, Karwa Chauth, Dhanteras, Govardhan Puja, Bhai Dooj, Tulsi Vivah, Kartik Purnima, Vivah Panchami, Mokshada Ekadashi).
   - No sitemap edit needed — citySlugs/festivalSlugs auto-fan-out.
3. **P12 /today daily devotion hub** (919862b)
   - Day-of-week deity (Vaar Devata) map, today's mantra, today's panchang, next festival countdown, 3-CTA grid, upcoming festivals (days 0-60, top 8).
   - Tolerant panchang fetch (graceful degradation if API cold).
4. **P13 2 new fleet agents** (919862b, wired into agents-daily.yml)
   - `seo-internal-linker` — inbound-link graph for ~25 high-value targets across 15 seed surfaces. Surfaces orphans + weak pages with linking suggestions.
   - `competitor-feature-watcher` — fingerprints H1-H3 + prices on 6 competitor surfaces (SriMandir/Utsav/AstroSage/AppsForBharat), diffs vs prior snapshot. Detects new SKUs + price changes + new landing pages. State file `_competitor-feature-watcher-state.json`.
5. **P14 blog markdown render upgrade** (919862b)
   - Added: H1, unordered lists, ordered lists, inline links (external-tab), images, blockquotes, fenced code blocks, inline code.
   - Preserved no-external-dep constraint. Code blocks pre-extracted + parked.
   - content-publisher drafts now render correctly instead of being silently flattened.

**Stats**: 5 new pages, 2 new agents, 25 new programmatic SEO entries (15 cities + 20 festivals - 10 dupes), 6 markdown elements added, full fleet now 16 daily agents.

**User-pending (unchanged):**

- **U18** `CRON_AUTH_TOKEN` GH secret
- **U19** `INDEXNOW_KEY` GH secret + `darshya.online/<key>.txt`
- **Rotate Resend key** `re_46d7rTF7_7DygN1pnEpG3T5Cmi5cMnvB3`
- **U16** flip CF `NEXT_PUBLIC_KNOWLEDGE_ENABLED=true` + `NEXT_PUBLIC_GURUKUL_ENABLED=true`
- **U1-U15** → `docs/activation-gates.md`

## HANDOFF 2026-05-27 (P5-P9 autonomous batch)

**Shipped:**

1. **CI cascade fix** (`.github/workflows/ci.yml`, 19ca6c0) — extended `--filter=!@poojly/remotion-pitch` to lint/type-check/test (was Build-only). turbo `dependsOn: ^build` was cascading remotion render into every job.
2. **`/city` programmatic-SEO** (c75c617) — 10 sacred cities (Varanasi, Mumbai, Delhi, Tirupati, Haridwar, Rishikesh, Ujjain, Ayodhya, Dwarka, Puri). Each gets famous temples (live API w/ static fallback), popular pujas, deity tags, nearby yatra. schema.org/Place + PostalAddress JSON-LD. Sitemap + robots + footer + i18n surfacing. Long-tail: "puja in {city}", "temples in {city}".
3. **Live blog reader** (1b85d97) — `/blog` index + `/blog/[slug]` now read agent drafts from `docs/agent-reports/blog-drafts/` via GH contents API (1h cache). BlogPosting JSON-LD per post. Sitemap fans out per draft. Tolerant fallback to coming-soon state.
4. **`/pujas/[slug]/temples` mirror** (4d355d4) — cross-direction of `/temples/[slug]/pujas`. "where to do {puja}", "best temple for rudrabhishek". Sorted by trustScore desc. Sitemap flatMap per puja slug. Detail page gets "Compare all →" link.
5. **NextFestivalStrip on home** (0c0090c) — above-the-fold countdown card between hero + our-story. Days-until badge, festival name + sanskrit + deity, direct "Book {first puja}" CTA + "Learn more" link.

**Stats**: 5 new pages, 1 new component, sitemap depth roughly doubled (city × 10 + blog × N + puja-temples × ~12).

**User-pending (unchanged from prior batch):**

- **U18** `CRON_AUTH_TOKEN` GH secret
- **U19** `INDEXNOW_KEY` GH secret + `darshya.online/<key>.txt`
- **Rotate Resend key** `re_46d7rTF7_7DygN1pnEpG3T5Cmi5cMnvB3`
- **U16** flip CF `NEXT_PUBLIC_KNOWLEDGE_ENABLED=true` + `NEXT_PUBLIC_GURUKUL_ENABLED=true`
- **U1-U15** → `docs/activation-gates.md`

## HANDOFF 2026-05-27 (P0-P4 autonomous batch — pushed 9bdef89)

**Shipped (unattended, per "go ahead and complete p0 to p4 end to end"):**

1. **`/changelog`** (`apps/web/app/changelog/page.tsx`) — every GH commit, public, hourly. Edge runtime, revalidate 3600. Type-tags feat/fix/agent/chore/docs. Linked from `/updates`.
2. **`/press`** (`apps/web/app/press/page.tsx`) — press kit: one-liner, elevator, logo block, 8 facts rows, 4 contact mailtos (press/partnerships/investors/founder), 4 further-reading links. Sitemap entry added.
3. **`/temples/[slug]/pujas`** (`apps/web/app/temples/[slug]/pujas/page.tsx`) — programmatic-SEO route, one file fans out to N temples. ItemList JSON-LD schema, filters active offerings, `${count} options` in title. Linked from sitemap (flatMap per templeSlug).
4. **`/hi`** (`apps/web/app/hi/page.tsx`) — real Devanagari landing replacing the prior fake 10 `/hi/*` sitemap entries. `lang="hi"`, hreflang alternates, 6 feature cards, NRI section. Other routes link back to canonical English (no thin-content penalty).
5. **3 new agents** (auto-discovered by `/admin/agents`, scheduled in `agents-daily.yml`):
   - `review-harvest` — HN Algolia + Reddit JSON scanner for 5 queries (darshya, sri mandir alternative, etc). Dedup by URL, writes markdown table.
   - `competitor-watch` — RSS diff against Sri Mandir / AppsForBharat / AstroSage / Utsav. State file `_competitor-watch-state.json`, only reports new posts.
   - `rss-to-thread` — generates X thread + LinkedIn post from today's agent reports. 7 tweets, emoji-tagged per agent type.
6. **E10 server-side filter** (`apps/api/src/routes/priests-public.ts`) — `getPublicPriests({ specialization, deity })`. Prisma `has:` on string[] + `some:` on offerings relation. Client `apps/web/lib/pandit-api.ts` typed query param.
7. **Public feed cleanup** (`apps/api/src/routes/admin-agents.ts`) — README + undated docs no longer leak into `/updates`. Regex gate `/^\d{4}-\d{2}-\d{2}$/.test(it.date)`.
8. **PostHog type unification** (`apps/web/lib/posthog.ts`) — merged duplicate `declare global { Window.posthog }` blocks (root cause of recent CI TS2717 + TS2532). `components/Analytics.tsx` now consumes the single source of truth.
9. **Sitemap repair** — removed 10 fake `/hi/*` URLs pointing nowhere. Added single real `/hi` + `/changelog` + `/press` + per-temple `/pujas` long-tail entries.

**Deferred:** E9 (Stripe Elements embedded) — too risky for unattended. Improved fallback now auto-opens `mailto:support@darshya.online` pre-filled with booking number when checkout redirect fails.

**User-pending (unchanged since overnight batch):**

- **U18** `CRON_AUTH_TOKEN` GH secret
- **U19** `INDEXNOW_KEY` GH secret + `darshya.online/<key>.txt`
- **Rotate Resend key** `re_46d7rTF7_7DygN1pnEpG3T5Cmi5cMnvB3`
- **U16** flip CF `NEXT_PUBLIC_KNOWLEDGE_ENABLED=true` + `NEXT_PUBLIC_GURUKUL_ENABLED=true`
- **U1-U15** → `docs/activation-gates.md`

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
- **Rotate Resend key** `re_46d7rTF7_7DygN1pnEpG3T5Cmi5cMnvB3` — leaked earlier this week.
- **U16** flip CF Pages `NEXT_PUBLIC_KNOWLEDGE_ENABLED=true` + `NEXT_PUBLIC_GURUKUL_ENABLED=true` then rebuild.
- **U1-U15** activation gates → `docs/activation-gates.md`.

## Pending — engineering

| # | Task | Notes |
|---|---|---|
| E2 | Wire FCM server key on user paste | env-or-noop, user-paste required |
| E9 | TODO(W8): embedded Stripe Elements | mailto fallback shipped 2026-05-27; full Elements integration still pending |

## Pending — user-action

→ `docs/activation-gates.md` (U1-U15).

**U16 (new):** Flip Cloudflare Pages env vars `NEXT_PUBLIC_KNOWLEDGE_ENABLED=true` and `NEXT_PUBLIC_GURUKUL_ENABLED=true`, then rebuild. (Optional: `KNOWLEDGE_CONTENT_DIR` on Render if API container ships MDX.)

**U17 DONE 2026-05-27** — secrets set, default branch flipped main, fleet verified green (c4a1495, 6 reports).

**U18 (new):** Set `CRON_AUTH_TOKEN` GH secret (matching Render env) so daily-cron workflow stops failing. If not set in Render either: generate `openssl rand -hex 32` + set both places. Currently daily-cron exits 1 at precheck.

**Prod migrations applied 2026-05-25** via `prisma db execute` against poojly Supabase. Verified via `apps/api/scripts/check-prod-tables.mjs` — 11/11 tables, 28/28 columns, 6/6 FKs. 7 total shipped now (5 prior + 3 fresh: lessons/streaks/badges + 2 gurukul migrations).

## Recently completed (top 5)

| Date | Task | Commit |
|---|---|---|
| 2026-05-27 | feat: P12-P14 — /today daily hub + seo-internal-linker + competitor-feature-watcher + markdown render upgrade | `919862b` |
| 2026-05-27 | feat: P11 — 15 cities + 20 festivals added (cities 10→25, festivals 10→30) | `ab9a8e2` |
| 2026-05-27 | feat: P10 — /aarti + /chalisa + /deity/[slug]/mantras programmatic-SEO | `5b91a52` |
| 2026-05-27 | feat(home): NextFestivalStrip above-the-fold countdown | `0c0090c` |
| 2026-05-27 | feat(seo): /pujas/[slug]/temples mirror — best temples per puja | `4d355d4` |
| 2026-05-27 | feat(blog): live blog reader from agent drafts on GitHub | `1b85d97` |
| 2026-05-27 | feat(seo): /city programmatic-SEO (10 sacred cities) | `c75c617` |
| 2026-05-27 | fix(ci): exclude remotion-pitch from lint/type-check/test (cascade) | `19ca6c0` |
| 2026-05-27 | feat: P5-P6 batch — /deity + /festival programmatic-SEO + ad12fb0 footer surfacing | `4c4614b` `48f5b6d` `ad12fb0` |
| 2026-05-27 | feat: P0-P4 batch — /changelog + /press + /temples/[slug]/pujas + /hi + 3 agents (review-harvest, competitor-watch, rss-to-thread) + E10 server filter + feed cleanup + sitemap repair | `9bdef89` |
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
