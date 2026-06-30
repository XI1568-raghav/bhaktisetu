# CEO Audit — Darshya / Bhaktisetu — 2026-07-01

> Source: 7-agent parallel fleet (opus). Read-only probe of live prod (`darshya.online`, `api.darshya.online`) + monorepo. No founder intervention required to read; intervention required to fix.

---

## TL;DR — 90-second read

**Where we are**: Product complete (8 roles, ~500 routes, 537/537 API tests). Distribution + revenue = zero. ₹0 MRR. 0 paying users. 0 organic traffic. Tripwire `<100 signups by day 30` already breached.

**Why we're stuck**: 4 founder-action gates block the entire flywheel — Razorpay live KYC (U1), Stripe NRI KYC (U2), rotate leaked Resend key (U12), ARE secrets paste. None are engineering problems.

**Hidden landmines** (engineering can fix this week):
1. **Admin auth fail-open** (env unset → world-readable) — `apps/admin/middleware.ts:9-11`
2. **OG image points to `localhost:3000`** — every social share dead
3. **Security headers F-grade** — no HSTS/CSP/X-Frame in prod (contradicts shipped claim)
4. **Mobile API URL → `localhost:4000` fallback** — devices 100% fail unless EAS profile set
5. **CI red on main** last 3 runs, 4-5s install-step failures
6. **GH Actions 111% of free-tier cap** — will throttle mid-month
7. **DB backup is theatre** — workflow green, zero actual dumps (secrets unset)
8. **5 SLA-breach puja bookings 30d+ overdue**, ₹2,505 escrow held
9. **35 broken `/store` `/content` `/darshan` links live in prod**

**Mobile verdict**: Android + iOS BOTH BLOCKED — no Razorpay SDK, no video lib, no native folders, last EAS build April (failed).

---

## 1. Liveness snapshot

| Surface | Status | Notes |
|---|---|---|
| `https://darshya.online/` | 200 | TTFB 2.98s (cold, `cf-cache-status: DYNAMIC`, no edge cache) |
| `https://www.darshya.online/` | 200 | TTFB 2.25s — **no canonical redirect apex↔www** |
| `https://api.darshya.online/health` | 200 | 1.39s, fresh ts. Fastify 5.3.2, Node 22, Prisma 6.6 |
| `/ready` | 200 | OK |
| `/healthz` `/api/health` `/v1/health` `/__health` `/docs` | 404 | No Swagger, no doc surface |
| `/sitemap.xml` `/robots.txt` `/favicon.ico` `/manifest.json` | 200 | Fine |

**Security headers grade: F.** No HSTS, no CSP, no X-Frame-Options, no X-Content-Type-Options, no Referrer-Policy, no Permissions-Policy. TASKS.md HANDOFF #20 claims CSP nonce shipped — **prod contradicts that claim** (rollback? env-gated? never deployed?).

---

## 2. Critical bugs (P0 — fix in 7 days)

### Security / auth

| # | Bug | Location | Impact |
|---|---|---|---|
| P0-1 | Admin middleware **fail-open** if `ADMIN_DASHBOARD_TOKEN` unset | `apps/admin/middleware.ts:9-11` | Entire 14-page admin world-readable |
| P0-2 | `'demo-admin'` bearer fallback in admin API client | `apps/admin/lib/api.ts:24` | Silent prod break + auth leak vector |
| P0-3 | Mobile demo credentials hardcoded | `apps/mobile/lib/auth-context.tsx:14-40` | Offline ADMIN role bypass |
| P0-4 | No HSTS/CSP/X-Frame on any page | CF Pages env / middleware | Clickjacking on `/donations` + `/pujas/*/book`, SSL-strip risk |
| P0-5 | `/admin` returns 200 with client-only AuthGuard | `darshya.online/admin` | Crawlable; robots.txt won't stop attackers |

### Distribution / SEO

| # | Bug | Location | Impact |
|---|---|---|---|
| P0-6 | OG image = `http://localhost:3000/og/default.png` | Web meta tags | Every WhatsApp/FB/X/LinkedIn share preview broken. NRI virality dead. |
| P0-7 | apex ↔ www both 200, no 301 | DNS / CF Pages | Duplicate-content, SEO split, cookie/session fragmentation |

### Mobile shippability

| # | Bug | Location | Impact |
|---|---|---|---|
| P0-8 | API URL falls back to `http://localhost:4000` | `apps/mobile/lib/api.ts:1` | Devices 100% fail unless EAS dev profile sets `EXPO_PUBLIC_API_URL` |
| P0-9 | No `react-native-razorpay` / Stripe RN | `apps/mobile/package.json:22-48` | No in-app checkout — monetization blocker |
| P0-10 | No `expo-av` / `react-native-video` | `apps/mobile/package.json` | `darshan-player.tsx` will crash at runtime |
| P0-11 | No `ios/` or `android/` folders, last EAS build April (failed) | `apps/mobile/` | Nothing to upload to Play/TestFlight today |

### Infra

| # | Bug | Location | Impact |
|---|---|---|---|
| P0-12 | GH Actions **~111% of 2000 min/mo cap** | `.github/workflows/*` aggregate | Will throttle mid-month. `roadmap-loop` 1080 min/mo dominant |
| P0-13 | DB backup is theatre — workflow green, zero dumps | `.github/workflows/db-backup.yml` (secrets unset) | RPO 1h target violated indefinitely. Last real backup unknown. |
| P0-14 | Render 96% steady + no build path-filter | Render dashboard / `render.yaml` | Already burned quota once 2026-06-15→17. Will repeat. |
| P0-15 | CI red on `main` last 3 runs (4-5s install-step) | `.github/workflows/ci.yml` | Blocks merges, no test signal |

### API routes

| # | Bug | Location | Impact |
|---|---|---|---|
| P0-16 | `/api/v1/pujas` `/causes` `/leads` return 404 at root | `apps/api/src/routes/` | Web/mobile clients calling bare names hit 404 |

### Business ops

| # | Bug | Location | Impact |
|---|---|---|---|
| P0-17 | 5 SLA-breach puja bookings 30d+ overdue, ₹2,505 escrow held | `docs/agent-reports/2026-06-15-booking-quality-monitor.md` | Trust collapse, refund risk, regulatory exposure |
| P0-18 | 35 broken `/store/*` `/content/*` `/darshan/*` 404s | `docs/agent-reports/2026-06-15-broken-link.md` | Every external visitor hits dead pages |

---

## 3. High bugs (P1 — fix in 14 days)

### Performance / UX

- **TTFB 2.98s homepage cold** — way above 800ms India 4G LCP budget. No SSG/ISR cache despite edge runtime.
- **Title double-suffix**: `Rudrabhishek Puja — Book Online | Darshya | Darshya`. Layout template appends "| Darshya" to titles that already end in "| Darshya".
- **No 3rd-party scripts in HTML** — GTM, GA, PostHog, FB pixel, Razorpay all absent. Either CSP blocked or never wired. PostHog identify/reset shipped per HANDOFF #20 (e500fef) — funnel data may be empty.
- **`/api/og` 404** despite shipped per HANDOFF #14.

### API hygiene

- **~40 env vars drift** — read by `apps/api/src/**` but missing from `.env.example` (Stripe keys, Razorpay plan IDs, WhatsApp secrets, Resend config, ADMIN_EMAILS, ALLOW_DEMO_TOKENS, etc.). Onboarding new env = guesswork.
- **No `/docs` Swagger** for 344 endpoints. B2B consumers exist (`routes/b2b.ts`) — they're flying blind.
- **TODOs in prod routes**: `routes/b2b.ts:71` (API-key persistence unimplemented), `routes/content.ts:103` (like-toggle unimplemented).
- **`/api/v1/priests` vs `/priests-public`** naming drift, no consumer audit.

### Admin

- **Dead nav `/leads`** — `apps/admin/components/admin-nav.tsx:10` links nowhere (only `/leads-conversion` exists).
- **No admin deploy URL** — `apps/admin/package.json:8` build is `echo "build: ok"`. Not deployed standalone. Two `/admin/*` surfaces (this app + `apps/web/app/admin/metrics`) — pick one.
- **Zero admin tests**.

### Mobile

- **Push notifications scaffold only** — `expo-notifications` not installed, FCM key absent.
- **30 screens route through `portal-placeholder`** — provider portals (temple/astrologer/gaushala/store/wellness) largely stubbed.
- **App version `1.0.0` / build 1** since inception.

### Infra

- **`roadmap-finalize` triggers on every main push** — no path-filter beyond `docs/roadmap/done`. Docs-only commits w/o `[skip ci]` rerun it.
- **`lighthouse-weekly` cron killed 2026-05-28** — no perf regression watchdog active.
- **Onboarding-nudge + support-intent-triage agents do 0 work** (no Resend, no inbound). Burning ~150 min/mo for no signal.

### Tests

- **Web vitest 47 TS errors** — `@testing-library/react` types not installed. Top offenders: `CategoryNav.test.tsx` (14), `OnboardingModal.test.tsx` (11), `JitsiCallButton.test.tsx` (10).
- **E2E weekly is a false-green** — 4s runtime = site-availability `test.skip` guard short-circuits every spec. Suite reports success without exercising anything.
- **Admin + Mobile zero coverage**.

### Medusa-store

- **Stub since 2026-05-02**, 0 deps, `start` exits 1. Neither bootstrapped nor deleted. `apps/web/lib/medusa.ts:60` falls back to seed catalogue (env unset).

---

## 4. Polish (P2 — backlog)

- Hero hot-links 8 Wikimedia Commons JPEGs (rate-limit ban risk, flagged 2026-05-03 still alive).
- "Aaj Purnima, Purva Ashadha" tithi chip is static text (no per-request panchang).
- Keyword-stuffed meta `keywords` (`darshan,puja,temple…darshya`) — deindex risk.
- Footer tel: link has internal space.
- 7 TODO/FIXME markers in `apps/api/src` — triage + close.

---

## 5. Where we are — CEO read

### Product (shipped)
- 8-role super-app: devotee/pandit/temple/astrologer/gaushala/store/wellness/gurukul
- ~500 prod routes (web 200+ pages × API 344 endpoints)
- 65 Prisma models, video-proof pujas, NRI USD billing, 80G donations
- Autonomous Roadmap Engine + 24 daily agents + 10 weekly CXO advisory + 7 onboarding drip
- 537/537 API tests green
- Sprints 1-3 security hardening
- Programmatic SEO ~500 URLs
- Brand/UI Days 1-4

### Business (numbers)

| Metric | Value | Source |
|---|---|---|
| MRR | **₹0** | CFO doc, pre-revenue |
| Paying users | **0** | KPI cache |
| Daily signups | 0 | funnel-drop-analyzer 2026-06-15 |
| KPI scrapers | **stale since 2026-06-11** | `docs/roadmap/_kpi-cache.json` |
| Funnel events (landing/signup/kyc/booking) | all 0 yesterday | agent-reports |
| Tripwire `<100 signups day 30` | **breached** | `ceo-roadmap-2026-05-27.md:57` |
| Roadmap items in_progress / blocked / shipped | 146 / 3 / 157 | grep status: |
| Agent fleet | 24 daily + 10 weekly + 7 drip | TASKS.md Phases C/E/G |

### Founder-action gates (blocks everything)

| Gate | What | Time to unblock |
|---|---|---|
| **U1** | Razorpay live KYC submit | 1-2 days docs + 7-14 days approval |
| **U2** | Stripe NRI KYC submit | 1-2 days docs + 5-10 days approval |
| **U3** | Apple Dev account $99 | 1 day |
| **U4** | Play Console $25 | 1 day |
| **U5** | FCM server key | 30 min |
| **U12** | **Rotate leaked Resend key `re_46d7rTF7_…`** | 10 min (urgent — kills all outbound email) |
| **ARE secrets** | `ANTHROPIC_API_KEY_BLACKBOX_PROXY`, `SUPABASE_DIRECT_URL`, `POSTHOG_PERSONAL_API_KEY` | 30 min |

### Strategic risks (top 3)

1. **Distribution-empty + supply-empty death spiral**. Product complete, demand signal zero. Tripwire breached. Need 1 founder-led acquisition channel pumping in 14 days or fold to NRI-only SKU per ROADMAP.md.
2. **Sri Mandir moat**: 30M users, 4yr head start, Hindi-press credibility. They lack video-proof + NRI tier + gaushala — Darshya's only differentiators. If Sri Mandir ships USD tier → fold immediately per tripwire.
3. **Solo-founder + $0 cash + agent motion-without-progress**. 50 outreach emails/day drafted, 0 sent (Resend dead). Risk of feeling productive while burning runway.

---

## 6. Prioritized fix order — next 14 days

### Day 1 (today) — founder solo, ≤2 hours
- [ ] **U12 rotate Resend key** (10 min) → unblock 7 onboarding drip agents + investor outreach
- [ ] **U1 Razorpay KYC** docs upload (60 min) — unlocks all domestic revenue lanes
- [ ] **U2 Stripe NRI KYC** docs upload (45 min) — unlocks 9-10× revenue leverage
- [ ] **Paste ARE secrets** in GH (15 min) → start 7-day soak

### Day 1-2 — engineering hot-fixes (≤8 hours, 1 PR)
- [ ] Fix `apps/admin/middleware.ts:9-11` fail-open → throw on env missing (fail-closed)
- [ ] Fix `apps/admin/lib/api.ts:24` — remove `'demo-admin'` fallback, throw on env missing
- [ ] Fix `apps/mobile/lib/api.ts:1` — refuse to build without `EXPO_PUBLIC_API_URL`
- [ ] Strip demo credentials from `apps/mobile/lib/auth-context.tsx:14-40` behind `__DEV__` guard
- [ ] Set `NEXT_PUBLIC_SITE_URL=https://darshya.online` in CF Pages env → fixes OG localhost leak

### Day 2-3 — security headers + redirects (≤4 hours)
- [ ] Ship HSTS + CSP + X-Frame-Options + X-Content-Type-Options + Referrer-Policy on `apps/web/middleware.ts` (verify deploy via `curl -I`)
- [ ] Add 301 apex → www (or vice versa) at CF level
- [ ] Add server-side gate on `/admin` (return 401 not 200)

### Day 3-4 — broken links + SLA bookings (engineering 1 day)
- [ ] Resolve 5 SLA-breach puja bookings — refund or fulfill (founder + ops)
- [ ] Fix 35 broken `/store` `/content` `/darshan` links via seed-data + route stubs
- [ ] Add canonical `/api/v1/pujas` `/causes` `/leads` GET endpoints

### Day 5-7 — infra hygiene (≤6 hours)
- [ ] Land 3 Supabase secrets for `db-backup.yml` (5 min if you have keys)
- [ ] Set Render Build Filter `apps/api/**, packages/**, package.json, pnpm-lock.yaml`
- [ ] Cut `roadmap-loop` cron from `*/8h` to `*/12h` (saves 360 min/mo)
- [ ] Fix CI install-step failure on main (`gh run view --log-failed`)
- [ ] Install `@testing-library/react` types → unblock web vitest (47 errors)

### Day 7-10 — founder acquisition push (Mon-Wed week 2)
- [ ] **Personally onboard 5 pandits Bengaluru + 5 temples Varanasi via WhatsApp** (CEO roadmap Week 2). Agents cannot do this.
- [ ] Push to first 10 real test bookings via personal network → first MRR data point → unlocks investor pitch traction slide

### Day 10-14 — mobile unblock (if budget allows)
- [ ] `expo prebuild` + add `react-native-razorpay` + `expo-av` + `expo-notifications`
- [ ] First successful EAS preview build for Android
- [ ] Defer iOS until U3 Apple Dev cleared

### Defer (P2 — not this 14d)
- Medusa-store decision (kill or commit)
- Wedding planner v1 (R-Q4-E-010)
- Affiliate tracking v1 (R-Q3-E-009)
- Swagger /docs surface
- Wikimedia hotlink replacement
- Admin tests + mobile tests bootstrap

---

## 7. Open questions for founder (require human decision)

1. **Incorporate now or stay sole-prop?** Blocks GST/80G/term-sheet path.
2. **Astrology surface — fix or delete?** Cited as broken UX in multiple audits.
3. **NRI subscription this quarter — yes or defer?** 9-10× revenue leverage vs solo bandwidth.
4. **Which 1 channel gets 80% of next 30 days** — paid NRI Facebook, organic Twitter "build-in-public", or temple-chain warm intros (ISKCON/BAPS)?
5. **Admin app future** — separate `admin.darshya.online` CF Pages project, or merge into `apps/web/app/admin/*`?
6. **Medusa-store kill or commit?**
7. **Mobile v1 — full in-app checkout, or "browse + redirect to web"?** Decides RN payment SDK requirement.
8. **Is CSP middleware actually deployed?** If yes — verify; if no — ship now.

---

## 8. Sources

- `docs/ceo-roadmap-2026-05-27.md`
- `docs/company/{03-cfo,README}.md`
- `docs/competitor-matrix.md`
- `docs/activation-gates.md`
- `docs/roadmap/{_kpi-cache,_budget-snapshot}.json`
- `docs/agent-reports/2026-06-15-*.md` (funnel-drop-analyzer, booking-quality-monitor, broken-link)
- `docs/free-tier-budgets.md`
- `docs/backup-restore-runbook.md`
- `TASKS.md` (HANDOFF #13-#20, ARE Phases C-J)
- `ROADMAP.md`
- `apps/admin/middleware.ts`, `apps/admin/lib/api.ts`, `apps/admin/components/admin-nav.tsx`
- `apps/api/src/server.ts:221`, `apps/api/prisma/schema.prisma`
- `apps/mobile/lib/api.ts`, `apps/mobile/lib/auth-context.tsx`, `apps/mobile/package.json`
- `apps/web/middleware.ts`, `apps/web` HTML meta
- `.github/workflows/*.yml`
- `web-tsc.log`, `api-tsc.log`

— End of audit. Generated by 7-agent opus fleet, 2026-07-01.
