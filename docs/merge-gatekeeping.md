# Merge Gatekeeping — Private Repo on GitHub Free

> **Why this exists:** On 2026-07-10 we decided to **keep the repo private**
> (a real production Supabase DB password is baked into 2 git commits —
> `aafa9386` + `cc02057d` — going public would expose it; history rewrite
> was declined as too high-blast-radius). GitHub Free offers branch
> protection + required status checks **only for public repos**, so while
> private we have **no server-side merge gate**. This file is the substitute
> convention + the portable bridge to real gatekeeping the moment the repo
> goes public.

## The rule (private)

**Do not merge a PR until its CI is green.** No exceptions for "it's just docs."
The human is the merge gate. A PR with a red check is not mergeable, full stop.

## Required checks (standardized job names)

These names are **frozen** so that if/when the repo goes public we can list
them verbatim as required status checks in branch protection — no rename,
no broken `required check name` mismatches (the #1 silent trap when a job is
renamed and the old required-check name hangs in branch protection).

| Job name | Workflow | What it gates |
|---|---|---|
| `verify` ("Lint + Type + Test + Build") | `ci.yml` | lint, type-check, unit test, build — the heavy gate |
| `lint-commits` | `commitlint.yml` | Conventional Commits message format |
| `fleet-integrity` | `pr-checks.yml` | agent scripts exist + parse + probe routes valid |

**On going public**, add all three as required status checks on `main`
(branch protection → require status checks to pass before merge). Until then,
treat all three as **merge-blocking by convention**.

## The bridge to public (when you're ready)

1. **Rotate the Supabase DB password first.** Dashboard → Project Settings →
   Database → Reset password. The leaked string (`Sindhibatra@12` for project
   `hlkvfarvfblhzhhnhtbp`) becomes useless. Update the `SUPABASE_DIRECT_URL`
   GitHub secret + Render env for both services (`bhaktisetu` API +
   `darshya-web`) + any local `.env`. Verify prod still connects (the
   `prisma migrate deploy` start step must succeed).
2. **Flip the repo public** (GitHub → Settings → General → Danger Zone).
3. **Enable branch protection** on `main`: require the 3 checks above,
   require PR review (1), dismiss stale reviews on push, do not allow
   force-push, do not allow deletions.
4. The leaked password is already dead (step 1), so its presence in history
   is cosmetic. A history rewrite is optional, not required, after rotation.

## What this does NOT cover

- **No enforceable protection against direct pushes to `main`.** By
  convention, all changes go through a PR. A direct push is a process
  violation, not a blocked action — until public.
- **The `GITHUB_TOKEN`-can't-trigger-CI trap** still applies: bot PRs
  (`create-pull-request`, `changesets-action`) created with the default
  token will NOT re-trigger `on: pull_request` workflows on the new branch.
  If a fleet/agent bot PR must run CI, use a PAT or GitHub App token.
- **Self-review is not review.** A PR author cannot satisfy the "require
  review" rule on public (GitHub blocks self-approval); in private we honor
  the same intent — get a second set of eyes or a verification subagent
  (see roadmap item P3.15) before merge.
