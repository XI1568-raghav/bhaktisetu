# Go-live status — 2026-10-06 (single source for a fresh or cloud session)

Repo `XI1568-raghav/bhaktisetu`. `main` = see `git log -1`; production runs `31f9fe38` until the deploy below is done.
Read with: `TASKS.md` ("STATE AT 2026-10-06"), `docs/handoff.md` (2026-10-06 block), `docs/runbooks/local-e2e-stack.md`, `docs/runbooks/prod-db-task.md`.

## 00. Update 2026-10-06 (morning IST): manual deploys done
The owner deployed BOTH Render services by hand (web then API) at the then-latest main (includes #279-#323). Verified live by curl: `/api/v1/ai/health` ok (Groq now on gpt-oss), `/astrology/ask` returns source `llm`, `/ai/chat` streams, `/ai/translate` works, self-hosted images return 200 (`/images/temples/badrinath.webp`), "Adopt a Cow" title gone, new admin routes answer 401 (deployed).
NOT yet live: #325 (astrology chat uses the larger model; the 20b model mislabelled Leo as कर्क) merged after that deploy: needs one more API deploy. The two prod SQL files are NOT applied (temples still show 0 offerings: `/api/v1/temples/badrinath-uttarakhand/pujas`): run `ops/sql/commission-default-80.sql` then `ops/sql/seed-default-temple-offerings.sql` in the Supabase SQL editor (or via prod-db-task once Actions works), then re-check the offerings count.
Cloud-environment capability checks (Postgres install, reaching prod, `gh` login) could not be run from the owner's laptop session: the cloud session must run them itself first.

## 000. Update 2026-10-06 (later): Actions unblocked, seed applied
GitHub Pro is active, so Actions runs again; spend is capped at the plan (keep every Actions/Packages/LFS budget at $0, do NOT set an overage budget). `SUPABASE_DIRECT_URL` was holding the project API URL, not a Postgres URI; it is now the Session pooler URI and `prod-db-task.yml` works (verify dry-run run 2, seed dry-run + apply after #327). API was redeployed at 27642e5 (#325 live). Commission default is already 0.80 in prod (4 of 4 priests). The temple offerings seed is applied: all 20 temples list 5 offerings. Ledger: 429 of 463 closed (COM-12, PM-03, PF-16 closed with evidence). Scheduled workflows trimmed: agents-health daily, e2e on the 1st and 15th.
Deliberately NOT changed: the 409 `temple_not_linked` (a real blocker the UI reads; 403 would be cosmetic churn); the temple-edit audit table (needs a prod table, manual migration).

## 0000. Update 2026-10-06 (evening): deploys, images, speed measurement
Web + API redeployed at e8fe2dd (#328: marriage add-ons gated, astrology prompt, scheduled CI trimmed). Email via Resend is live on the API side (magic-link send accepted). Production demo tokens are rejected and every role's protected endpoints answer 401. Deployed at ced4a90 (#329, web then API): house numbers banned in astrology answers without a chart; 25 more photos self-hosted (all but one GFDL file); production Lighthouse report in `docs/perf/cwv-production-2026-10-06.md` (home LCP 3.1s, /temples 6.7s, /pujas 3.8s, /astrology 6.9s). Ledger: 431 of 463 closed (TD-09, CM-08 closed). Verified live: new /images/content files return 200 and three astrology answers had no house numbers. Next engineering: stream first temple cards outside Suspense, trim render-blocking CSS/fonts (see the perf report). A Nov 1 reminder checks Actions minutes.

## 00000. Update 2026-10-07: speed PR
PR (not yet deployed): /temples and /astrology render their content in the initial HTML (both called `useSearchParams()`, which forced a client-side bailout); Indic fonts get `unicode-range`; third-party scripts and Sentry load after window load; temple hero `sizes`; internal links use the canonical temple slug; a free-licence (CC BY-SA) homa photo replaces the GFDL one. Verified in a real browser: no marriage add-on is offered. Voice pandit: speech-to-text and the model answer work live, the spoken reply is empty because the ElevenLabs key is not set on the API (owner item). Deploy WEB first, then API; re-measure with Lighthouse after.

## 0. The one blocker
GitHub Actions has no free minutes and no budget (jobs fail to start with "recent account payments have failed or your spending limit needs to be increased"). Deploys, PR checks, `prod-db-task.yml` and `db-backup.yml` all run on Actions. Everything else is merged. Unblock: owner sets an Actions budget at github.com/settings/billing (about $10 covers ~1,250 Linux minutes), or deploys by hand in the Render dashboard.
Render is deliberately manual-deploy only (`autoDeploy: false`): merging never deploys. Deploy order this time: WEB first (`darshya-web`, srv-d970l2ks728c738fc33g), then API (`bhaktisetu`, srv-d7mc2n8sfn5c73dfce0g), because the API now returns `https://darshya.online/images/...` URLs that only exist after the web deploy.

## 1. Closed
Old audit ledger (`docs/audit/LEDGER.json`): 426 of 463 closed (37 open: owner-gated or partial; each has a dated status note).
This round (all merged to main, verified locally api/web/mobile): #279-#323. By area:
- Review/CI plumbing: AI reviewer on the Claude subscription, hooks, CI no longer runs on push to main (#308), fonts self-hosted, deploy polling trimmed.
- Devotee/visitor: false-claim removal, CSP, rounding, copy sweeps (#309, #315, #320), IST slot labels (#290), NRI claims (#292), referral hidden (#303).
- Pandit: stranded-booking fix (#279), start-time gate and earnings preview (#287), video proof required to complete (#301), earnings held until proved (#289), pandit-direct NRI (#312).
- NRI: price = 2.5x puja price, shown in USD, charged as INR via explicit `nriPricing` flag (#300, #312).
- Admin: Bookings + waiting count (#281), refunds follow the cancellation policy (#282), payout bank details (#283), gaushala funds (#286), awaiting-refund tile (#298), temple funds (#296), temple editor + standard offerings (#321).
- Astrologer/wellness/store/gaushala: honest copy (#284), earnings held (#288, #297), COD creates no commission (#285), quality gate on edits and COD split (#310), earnings split labels (#311, #316, #320).
- Temple: access needs approved profile (#291), lead conversion (#293), donations page (#294) and rules (#295), share held until proved (#304), assigned-priest routing (#305), roster consent (#306), schedule nav (#302), explicit manager->temple link (#314), every temple bookable (#321).
- Platform: English API errors by default (#299), mobile sends language header (#307), AI diagnostics + failover (#317), Groq model fix (#319), prod DB task workflow + backup repair (#318), self-hosted photos + paint/CLS fixes (#322), docs (#313, #323).

## 2. Pending on the agent (cloud session) — after the deploy
1. Deploy web then API with the commit pinned: `gh workflow run render-diag.yml -f mode=deploy -f sid=<SID> -f commit=<SHA>` (or the owner clicks Manual Deploy).
2. Prod DB (dry-run first, then apply): `ops/sql/commission-default-80.sql`, `ops/sql/seed-default-temple-offerings.sql`; read-only `ops/sql/verify-commission-state.sql`. Via `gh workflow run prod-db-task.yml -f file=ops/sql/<x>.sql -f mode=dry-run`.
3. Run `db-backup.yml` once, confirm a non-empty dump (needs `BACKUP_S3_*` for an offsite copy; without it the dump is a 7-day artifact).
4. Verify live: `/api/v1/ai/health` ok; `/astrology/chat`, `/ask-pandit`, `/ai/translate`, voice-pandit answer from the model (`source` llm); a temple page shows five offerings and books end to end; `/admin/temples`; photos from `/images/...`; `/refer` coming soon; prasad form India-only.
5. Logged-in production pass per role once email works (owner item A).
6. Close COM-12 (and any item the deploy proves) in the ledger.
7. Remaining engineering follow-ups: marriage booking add-ons (live chanting, photography) still tickable on `/pujas/marriage/book`; ~90 less-used Commons images still hotlinked; simulated LCP 6.7-7.7s on /temples, /pujas, /astrology (fonts + JS weight, needs a design call); temple edits have a log line but no audit table; unapproved temple manager gets 409 not 403 (cosmetic); mobile has no puja booking (web-first launch); sign-in token in browser storage (SEC-02, large, low launch risk).
8. Nov 1: check GitHub Actions usage (target about 1,100 of 2,000 min; watch pushes per PR and rerun flakes).

## 3. Pending on the owner (cannot be done from code)
A. Resend: verify `send.darshya.online`, set `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO`, `ADMIN_EMAILS` in Render (API); Supabase Auth -> SMTP -> Resend; Auth redirect `https://darshya.online/auth/reset-password`.
B. Security: rotate Supabase DB password, service-role key, JWT secret (set `SUPABASE_JWT_SECRET` in Render), Razorpay keys + webhook secret, GitHub token, Resend key; point local `apps/api/.env` away from production (`docs/runbooks/secret-rotation.md`).
C. Backups: R2 (or similar) bucket + `BACKUP_S3_ENDPOINT/BUCKET/ACCESS_KEY_ID/SECRET_ACCESS_KEY` GitHub secrets; one restore drill.
D. Render: choose the 750 shared free hours option (API on Starter $7, or accept sleeping); keep the API start command as is (migrations are applied by hand).
E. Legal facts: 80G number + PAN, legal entity/address/GSTIN, grievance officer name/phone, GST position from the accountant.
F. Decisions/one-offs: Rs 101 real card payment, Razorpay International Payments, payout rail, PostHog key, store-returns policy wording, which temples go live first, the 38 older ledger items.
G. GitHub billing / Actions budget (section 0).
If the owner cannot give Actions a budget: Render Manual Deploy for both services, and paste the two SQL files into the Supabase SQL editor.

## 4. Rules that must carry over
Verify merged main locally in api, web AND mobile before deploying (CI no longer runs on main); one commit + one push per PR; check Actions minutes before spawning many agents or reruns; no Prisma schema changes (prod migrations are manual); no secrets in chat or docs; gate or reword, never delete features; no unbacked claims; the owner never needs to be asked to sign in (use the local demo stack).
