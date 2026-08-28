# Runbook — disaster recovery (what actually exists)

> **Status: authoritative.** Written 2026-08-20 for `OPS-10`.
> **Supersedes `docs/engineering/disaster-recovery-runbook.md`**, which describes
> infrastructure this product has never had: a Render *Mumbai* region, a
> *Singapore* standby, a read replica, Cloudflare *Pages* hosting, an S3 +
> Glacier backup tier, a status page, and a Stripe failover. Following it during
> an incident would send the responder looking for consoles that do not exist.
> A runbook nobody can follow is worse than none, because it is read under stress
> and believed.
>
> Every row below was read out of this repository on 2026-08-20. Anything that
> could not be verified from the repository is marked **[verify]** rather than
> asserted.

## What this product actually runs on

| Layer | Reality | Where it is written |
|---|---|---|
| API | Render free web service `bhaktisetu`, **region `oregon`**, `srv-d7mc2n8sfn5c73dfce0g` | `render.yaml:15`, `:22` |
| Web | Render free Docker service `darshya-web`, **region `oregon`**, Next standalone, `srv-d970l2ks728c738fc33g` | `render.yaml:56`, `apps/web/Dockerfile` |
| DNS / edge | Cloudflare, **proxy + DNS only**. Apex and `www` CNAME to `darshya-web.onrender.com` | `docs/render-web-cutover-runbook.md` |
| Cloudflare Pages | **Not a hosting layer.** Auto-deploy killed 2026-07-08; last build frozen that day and scheduled for deletion | `cf-kill-zombie.yml`, cutover runbook |
| Database | Supabase Postgres. **Region is not recorded anywhere in this repo — [verify] in the Supabase dashboard and write it here** | — |
| Replicas / standby | **None.** No read replica, no second region, no warm spare | — |
| Backups | `db-backup.yml` daily 19:00 UTC, `pg_dump --format=custom` into Supabase Storage bucket `db-backups` | `.github/workflows/db-backup.yml`, `scripts/backup/supabase-backup.mjs` |
| Backup location risk | Backups live in **the same Supabase project they insure** (`OPS-03`). One account suspension takes the database and every backup together | `scripts/backup/supabase-backup.mjs` |
| Payments | Razorpay. A Stripe rail is **not** available as failover — the 2026-08-11 audit records Stripe as removed and its webhook as 404; `PaymentGateway.stripe` survives only as a schema enum value | `apps/api/prisma/schema.prisma:107` |
| Status page | **Does not exist.** `status.bhaktisetu.com` is aspirational copy | — |
| External uptime monitor | **None wired in this repository.** All monitoring runs on GitHub Actions (`OPS-09`) | — |
| Insurance / advisory board / CS contractor / crisis PR | **None of these exist.** They belong in a fundraising narrative, not in a runbook | — |

## Honest RTO / RPO

The superseded runbook published RTO 4h and RPO 15min–1h. Nothing in this system
produces those numbers.

| Service | Aspiration | **Actual today** |
|---|---|---|
| API | 4 h | **Bounded only by a human noticing.** Improved 2026-08-20: `agents-health.yml` now goes red and files an issue (`OPS-01`). Before that, a three-day outage read green six runs running |
| Web | 1 h | Same |
| Database | RPO 1 h | **RPO is unbounded until a backup is proven to exist.** `db-backup.yml`'s own header records that its secrets were never set, so the job produced zero bytes daily while reporting success. It now fails instead — but a failing job is still not a backup |
| Restore | 4 h | Untested. `docs/runbooks/db-restore.md` is written and detailed, and **no restore has ever been recorded as executed** |

**Before treating any RPO as real, run this and read the output:**

```bash
gh workflow run db-backup.yml --ref feat/recurring-razorpay-planid
gh run watch
# Green plus a non-empty uploaded object = a restore point exists.
# Red with "NO BACKUP WAS TAKEN"       = the secrets are still unset and there is none.
```

`--ref` is load-bearing until this branch merges. `db-backup.yml` is on `main`,
so it dispatches — but a dispatch runs the copy on the ref you name, and `main`
still holds the 72-line pre-guard version with no skip check, no size check and
no `restore_drill` input. Without the `--ref` you get exactly the workflow whose
silent zero-byte success is the finding, and it will report green.

Since 2026-08-21 the run also goes red when the dump is empty, too small, or not
a readable `pg_restore` archive, when the uploaded object cannot be read back at
the expected size, and when the only destination is the same Supabase project as
the database (`OPS-02` / `OPS-03`). Green now means something.

**And then prove the restore, which has never been done:**

```bash
gh workflow run db-backup.yml --ref feat/recurring-razorpay-planid -f restore_drill=true
gh run watch
```

That restores the newest dump into a throwaway Postgres inside the runner and
fails if fewer than 50 tables come back. Record the result in
`docs/runbooks/db-restore.md` → *DR drill history*, which is empty today.

## Scenario 1 — both hosts return 503

**This is the outage that actually happened** (2026-08-17 to 2026-08-20). It is
not a deploy fault and not a region fault.

Render free tier grants **750 instance-hours per ACCOUNT per month**, not per
service. Two always-on services need about 1,488 hours in a 31-day month. The
account reached 750.2 / 750 and Render suspended **both** services with
`"suspenders": ["billing"]`.

1. Confirm: `gh workflow run render-diag.yml -f mode=detail -f sid=<SID>` and
   read `.suspended` and `.suspenders`.
2. `render-hours-guard.yml` runs daily and opens a `render-suspended` issue on
   exactly this state.
3. Recovery is **not** a deploy. Either wait for the monthly reset and then
   `gh workflow run render-diag.yml -f mode=resume -f sid=<SID>`, or stop one
   service from being always-on.
4. The arithmetic does not improve on its own. See `docs/free-tier-budgets.md`.
   The API is the service that should stay up, because its in-process scheduler
   (`apps/api/src/jobs/scheduler.ts`) only ticks while the container runs.

## Scenario 2 — the API is up but the database is unreachable

1. `curl -s https://api.darshya.online/health | jq .` — since 2026-08-20 this
   performs a real `SELECT 1` and answers 503 after several consecutive failures
   (`apps/api/src/routes/health.ts`).
2. `curl -s https://api.darshya.online/ready | jq .` — separates db, redis and
   queue.
3. Check the Supabase dashboard for project status.
4. There is **no standby to fail over to.** The options are: wait for Supabase,
   or restore into a fresh project via `docs/runbooks/db-restore.md` and repoint
   `DATABASE_URL` / `DIRECT_URL` in the Render dashboard.
5. The API start command runs `prisma migrate deploy` before serving. A restored
   database whose `_prisma_migrations` table is empty will re-run every migration
   on the next boot — read `docs/runbooks/db-restore.md` before repointing.

## Scenario 3 — a bad deploy

Roll back with `docs/runbooks/prod-rollback.md`. Do **not** push a revert and
wait: both services are `autoDeploy: false`, so nothing deploys on push.

### 3b — the API restarts forever and never serves

Symptom: the Render log shows `prisma migrate deploy` failing, the container
exits, Render restarts it, and the same migration fails again. The service is
**down**, not serving an old schema — the API start command is
`prisma migrate deploy && node dist/server.js`, so a failed migration means
`node` is never reached.

This is the correct failure mode (it never serves against a schema the code does
not expect) but it does not self-heal, and the failed migration is now recorded
in `_prisma_migrations`, which blocks every later migration too.

Recovery, and why it happens at all — including the 16 objects that
`ensure-schema.ts` and the migrations both create — are in
**`docs/runbooks/schema-authority.md`**. Read that before touching anything
under `apps/api/prisma/`.

## Scenario 4 — data loss (corruption, accidental delete)

1. Freeze writes in the Supabase dashboard before anything else.
2. Confirm a restore point exists at all — dispatch `db-backup.yml` as above. If
   the answer is "no backup", say so out loud immediately; the rest of this
   procedure has no input.
3. Restore into a **fresh** project or staging, never over prod, following
   `docs/runbooks/db-restore.md`.
4. `OPS-03` applies: if the Supabase project itself is what was lost, a
   same-project backup went with it. The **code** for an offsite mirror now
   exists (see below); whether one is configured is visible in the backup run's
   JSON as `"offsite":true|false`. Steps 1 and 2 of the restore runbook read the
   dump *out of the Supabase project*, so in this scenario they have no endpoint
   to call — use `docs/runbooks/db-restore.md` → **"Steps 1–2, ALTERNATE — when
   Supabase itself is what you lost"**, which pulls the byte-identical object
   from the `BACKUP_S3_*` store instead. Everything from step 3 on is unchanged.

## Scenario 5 — Razorpay outage

There is no second payment rail. Bookings that require payment will fail.

- Verify at `status.razorpay.com`.
- Already-captured payments are unaffected.
- Do **not** plan on a Stripe failover; it is not wired. The `PAY-*` findings in
  `docs/audit/delta-completion-2026-08-20.md` cover the payment paths that must
  not silently drop money in the meantime.

## Scenario 6 — security incident

The legal obligations from the superseded runbook survive, because they come from
statute rather than from infrastructure:

- **DPDP: report to the Data Protection Board of India within 72 hours.**
- Invalidate sessions and force credential rotation.
- Notify affected users individually.

The rest of that section — independent forensic firm, crisis PR retainer, cyber
liability insurance claim — describes relationships that **do not exist**. Treat
them as things to arrange, not as steps to execute.

Related and still open: `OPS-11` — a production database password remains in git
history; untracking the file did not remove it. Rotation is an owner action.
**The exact steps, per credential, are in `docs/runbooks/secret-rotation.md`**
(added 2026-08-21), which names the commits and records what classes of
credential the leaked file holds without reproducing any value.

Re-measured 2026-08-28 with `scripts/secret-scan.mjs` against the historical
blobs, values classified by length and character class only and never printed.
It confirms that runbook's headline finding and sharpens one detail:

- The live-shaped credential — 16 characters, mixed upper/lower/digit, one
  percent-encoded character, no placeholder marker — is present in
  **`cc02057d` only**. `aafa9386` (`fix(security): close 3 critical pre-investor
  diligence gaps`, same day) had already replaced it with a 22-character
  placeholder. Three commits touch the file; **one** carries the credential.
  That narrows what a history rewrite would have to reach, and changes nothing
  about the need to rotate: it was pushed.
- No `eyJ`-prefixed token appears in either blob, so the real `service_role` key
  — which is a JWT — probably did not leak. The single `rzp_live_` occurrence is
  a mention, not a key: no key-shaped characters follow it.

**Prevention, code side, shipped 2026-08-28:** `.githooks/pre-commit` now runs
`scripts/secret-scan.mjs` over the staged diff on *every* commit, before its
existing roadmap check can exit early. This closes the direct-push-to-`main` gap
that the CI scan (pull requests only) cannot see, and it deliberately carries no
path filter — the file that leaked was markdown under `docs/`, which `ci.yml`
skips. Hooks are per-clone: `pnpm install` wires them via the root `prepare`
script, and you can confirm with `git config --get core.hooksPath` (must print
`.githooks`). It is shape-based, so a credential with no recognisable prefix
still passes, and it can do nothing about what is already in history.

## Customer compensation

The superseded runbook publishes a compensation matrix denominated in "wallet
credit". **There is no wallet model in `apps/api/prisma/schema.prisma`**, so
nothing in the product can issue one. Either implement a credit mechanism or
express compensation in refunds, which the refund service can actually perform.
Do not publish the matrix to customers until one of those is true.

## What is missing, in priority order

These are the gaps this runbook cannot paper over.

1. **A proven restore point.** Owner action, ~10 minutes. Set the three secrets
   named in the header of `.github/workflows/db-backup.yml`
   (`SUPABASE_DB_URL` — the DIRECT connection, port 5432, not the pooled 6543 —
   plus `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`), dispatch the workflow,
   and confirm the JSON line reports a `sizeBytes` in the millions. Then
   dispatch it again with `-f restore_drill=true` and record the result in
   `docs/runbooks/db-restore.md`. Until both are done RPO is unbounded and RTO
   is a guess. (`OPS-02`)
2. **Backups outside Supabase.** Owner action, ~15 minutes, free. Same-project
   backups do not survive an account suspension — the exact failure mode already
   seen on Render. The code path exists as of 2026-08-21; only the credentials
   are missing:
   1. Cloudflare dashboard → **R2** → *Create bucket* → `darshya-db-backups`
      (free tier: 10 GB stored, no egress fee; a dump is tens of MB, so a
      30-day retention is ~1 GB).
   2. R2 → **Manage API Tokens** → *Create API token* → **Object Read & Write**,
      scoped to that one bucket. Copy the Access Key ID, the Secret Access Key,
      and the S3 endpoint (`https://<accountid>.r2.cloudflarestorage.com`).
   3. GitHub → Settings → Secrets and variables → Actions, add
      `BACKUP_S3_ENDPOINT`, `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY_ID`,
      `BACKUP_S3_SECRET_ACCESS_KEY`. Leave `BACKUP_S3_REGION` unset — it
      defaults to `auto`, which is correct for R2.
   4. Dispatch `db-backup.yml` and confirm the output JSON now contains
      `"offsite":true` and a `destinations` array with two entries.
   Until then the backup job **refuses to run** rather than writing a copy into
   the account it is meant to insure. Set `ALLOW_SAME_PROJECT_BACKUP=true` only
   as a deliberate stopgap; the run then succeeds with a warning that says
   plainly that the copy is not protected. (`OPS-03`)
3. **A monitor that is not GitHub Actions.** Every check listed here runs on the
   quota it is meant to protect. (`OPS-09`)
4. **One service off always-on**, or the 750-hour cap suspends both again next
   month.
5. **The Supabase region, written down.** Nobody can reason about latency or data
   residency from a repository that does not record it.

## Founder-owned, recurring

- Dispatch `db-backup.yml` monthly and read the result. A green tick is not
  evidence; a non-empty uploaded object is.
- Restore into staging once a quarter. An untested backup is a hypothesis.
- Rotate anything that has ever been in git history.
