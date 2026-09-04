# Secret rotation — credentials that reached git history

> `OPS-11`. Written 2026-08-21. **This runbook contains no secret values and
> must never be edited to contain one.**

## The finding, stated exactly

`docs/chat-archive/038e0002-5099-4d22-83b2-f98bbf480df7.md` — a Claude Code
session transcript — was committed with live production credentials pasted into
it. It touches three commits:

| Commit | Date | What it did to the file |
|---|---|---|
| `cc02057d4d360d6d9018b250dd3f457033f4f1f5` | 2026-04-28 | **added** it (`docs: archive Claude Code session transcripts`) |
| `aafa9386df7f6e71d7f3bf3dc28fc8d5af13fcd2` | 2026-04-28 | **modified** it (`fix(security): close 3 critical pre-investor diligence gaps`) |
| `085dd3ca59df6c089ba7ddf810abbe589d075878` | 2026-08-19 | **deleted / untracked** it (`security: untrack docs/chat-archive`) |

`docs/chat-archive/` is now in `.gitignore` (line 69) and the file is gone from
the tip of every branch. **That changed nothing about the exposure.** The blob
is still reachable from the trees of `cc02057d` and `aafa9386`; anyone with
clone access, and anyone who ever cloned, still has it. `git show
cc02057d:docs/chat-archive/038e0002-…md` prints it today.

Measured 2026-08-21 against `git show cc02057d:<path>`. Values were classified
by length and character class only; **nothing was printed, and nothing may be**.

| Credential class | What the file contains | Assessment |
|---|---|---|
| Postgres DSN with an embedded password | 20 matching lines, **4 distinct passwords** | Three are placeholders (`...`; an all-lowercase word; an uppercase `[YOUR-…]` form). **One is 16 characters, mixed upper/lower/digit with a percent-encoded character, and carries no placeholder marker — treat it as a live production password.** |
| Database hosts | 5 distinct | One real `db.<ref>.supabase.co` and two real `*.pooler.supabase.com` hosts; two are documentation placeholders (`db.xxx`, `db.your-project`). |
| `SUPABASE_SERVICE_ROLE_KEY` | name appears 20×; one 41-character non-placeholder value | Ambiguous. A genuine Supabase `service_role` key is a JWT, and **no `eyJ`-prefixed token appears anywhere in the file** — so the real key may not have leaked. Rotate anyway; the cost of being wrong is asymmetric. |
| `JWT_SECRET` | 6 mentions; one 81-character non-placeholder value | Treat as leaked. |
| `RAZORPAY_KEY_ID` / live prefix | two non-placeholder values; `rzp_live_` appears once | Treat as leaked. The `KEY_SECRET` values captured all look like placeholders, but a key id plus one live-mode reference is enough to justify regeneration. |
| `RESEND_API_KEY` | 12 mentions, no captured value | Treat as exposed. |
| GitHub token | one `ghp_`/`github_pat_` style match | Treat as leaked. |

**Assume every credential named in that file is public.** Do not spend time
re-litigating which ones were "really" real — the table above is a best-effort
read of a transcript, not an inventory. Rotating a credential that was already
safe costs minutes; leaving one live costs the company.

## Why "just rewrite the history" is not the answer here

`git filter-repo` / BFG can remove the blob, but it rewrites every commit hash
from `cc02057d` onward, breaks every open PR and every clone, and — critically —
**does not retract a credential that has already been read.** GitHub also keeps
unreferenced objects reachable through the API for a period, and forks keep
their own copies.

So the order is: **rotate first, always. Rewrite later, optionally.** Rotation is
what makes the leaked strings worthless. History rewriting is hygiene, and it is
only worth the disruption after rotation is complete.

## Rotation steps

Do these in order. Each one is a dashboard action; none requires an engineer.
**After each rotation, update the corresponding value in Render *and* in GitHub
Actions secrets, or the service will fail to start on its next deploy.**

### 1. Supabase database password (highest priority)

1. Supabase dashboard → your project → **Project Settings → Database**.
2. **Reset database password**. Copy the new password once; it is not shown again.
3. Rebuild both connection strings from the same page:
   - **Direct** (port 5432) → this is `DIRECT_URL`.
   - **Transaction pooler** (port 6543) → this is `DATABASE_URL`.
4. Update, in this order:
   - Render → service **bhaktisetu** (API, `srv-d7mc2n8sfn5c73dfce0g`) →
     Environment → `DATABASE_URL`, `DIRECT_URL`.
   - GitHub → Settings → Secrets and variables → Actions → `SUPABASE_DB_URL`
     (used by `db-backup.yml`; must be the **direct** URL, not pooled).
   - Any other place `docs/operational-context.md` lists.
5. Render → **Manual Deploy** on the API. `autoDeploy` is `false`, so a push
   alone will not pick it up. Watch the log: `prisma migrate deploy` runs first
   and will fail loudly on a bad password, before the server starts.

### 2. Supabase `service_role` key and JWT secret

1. Supabase → **Project Settings → API → JWT Settings → Generate new JWT secret**.
   This rotates the `anon` and `service_role` keys together and **invalidates
   every existing user session** — expect all users to be signed out once.
2. Copy the new `service_role` key and the new `anon` key.
3. Update `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   everywhere: Render (API **and** web — the web service bakes
   `NEXT_PUBLIC_*` at build time, so the web needs a **rebuild**, not just a
   restart), and GitHub Actions secrets.
4. Redeploy API, then rebuild web.

### 3. Razorpay keys

1. Razorpay dashboard → **Account & Settings → API Keys → Regenerate**.
2. The live **secret** is shown exactly once. Update `RAZORPAY_KEY_SECRET` and
   `RAZORPAY_KEY_ID` in Render (API).
3. **Webhooks:** regenerating keys does not change the webhook secret. Rotate
   `RAZORPAY_WEBHOOK_SECRET` separately (Settings → Webhooks → edit → new
   secret) and update it in Render. Signature verification fails closed, so a
   mismatch means dropped payment callbacks — do this in a low-traffic window
   and confirm with a test payment afterwards.

### 4. Resend API key

1. Resend dashboard → **API Keys** → create a new key → update `RESEND_API_KEY`
   in Render → delete the old key.
2. Also update it in Supabase → **Auth → SMTP** if the project's mailer is
   pointed at Resend.

### 5. GitHub token

A `ghp_`-prefixed token appears in the file. GitHub → **Settings → Developer
settings → Personal access tokens** → revoke it, mint a replacement with the
narrowest scope that still works, update wherever it is configured.

### 6. Confirm

- `git log --oneline -3` on the API service's deployed commit, then curl
  `https://api.darshya.online/health` — after the `OPS-04` wiring lands this
  returns `db:"ok"` only when the new DSN actually connects.
  *(Production is suspended for billing as of 2026-08-17; this check is only
  meaningful once the account is restored.)*
- Sign in on the web app once. A stale `NEXT_PUBLIC_SUPABASE_ANON_KEY` in a
  cached build shows up here and nowhere else.
- Run `db-backup.yml` manually and confirm it is green with a non-zero
  `sizeBytes` — that exercises `SUPABASE_DB_URL` and
  `SUPABASE_SERVICE_ROLE_KEY` together.

## Optional, after rotation: remove the blob

Only worth doing once every credential above is dead.

```bash
# On a fresh clone, with every collaborator warned and every PR merged/closed.
pip install git-filter-repo
git clone --mirror git@github.com:<owner>/<repo>.git repo.git
cd repo.git
git filter-repo --path docs/chat-archive --invert-paths
git push --force --mirror
```

Then ask GitHub Support to garbage-collect unreachable objects, and have every
collaborator re-clone. Anyone who pulls instead of re-cloning reintroduces the
old objects.

## Prevention that is now in place

`.github/workflows/commitlint.yml` gained a **secret scan** step (2026-08-21).
It runs on every pull request — including docs-only ones, which is the point,
because the file that leaked was markdown and `ci.yml` carries
`paths-ignore: docs/**, **/*.md`. It scans only the PR's **added** lines for
credential shapes (Postgres DSN with a password, JWT-shaped keys, `rzp_live_`,
GitHub tokens, Resend keys, AWS access-key ids, private-key blocks), ignores
obvious placeholders, and **never prints a matched value** — only file, line and
rule name. A hit fails the PR.

Known limits, stated so nobody over-trusts it:

- It sees pull requests only. A direct push to `main` is not scanned.
- It is shape-based. A credential with no recognisable prefix (a bare API token,
  a password in a YAML value) will pass.
- It cannot help with anything already in history. That is what rotation is for.

## Related

- `docs/operational-context.md` — where each credential is configured.
- `docs/runbooks/disaster-recovery.md`.
- Ledger: `OPS-11`, and `S-12` which is the same rotation action for a different
  artifact (`apps/api/.env`). Doing the steps above closes both.
