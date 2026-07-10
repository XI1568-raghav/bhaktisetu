# Branch Protection — `main` required checks

> Branch protection CANNOT be enforced via a repo file — it is a GitHub
> repository setting. This doc records the intended policy + the exact steps
> so it is a repeatable ops task, not tribal knowledge. Last updated 2026-07-10.

## Policy

The `main` branch MUST require the CI gate before a PR can merge. The gate is
the **`verify`** job in `.github/workflows/ci.yml`:

- workflow name: `CI`
- job id: `verify`
- job display name: `Lint + Type + Test + Build`

It runs `lint` + `type-check` + `test` + `build` (paths-filtered, docs ignored).
A PR must not land on `main` with `verify` red or missing.

Note: `e2e.yml` is **informational only** (continue-on-error, runs against prod
on a weekly schedule, no PR trigger since 2026-07-10) — it MUST NOT be a
required check. Requiring it would block merges on a weekly prod probe that
tests already-deployed code.

## Exact GitHub settings steps (repo admin)

1. Go to https://github.com/XI1568-raghav/bhaktisetu/settings/branches
   (Settings → Branches).
2. Click **Add branch protection rule** (or edit the existing `main` rule).
3. Branch name pattern: `main`.
4. Enable **Require status checks to pass before merging**.
5. Enable **Require branches to be up to date before merging** (recommended —
   forces a fresh `verify` run on the latest main, not the PR's base).
6. Under "Search for status checks", add:
   - `Lint + Type + Test + Build` (the `verify` job's display name)
   
   Use the display name exactly as shown in the checks UI. If GitHub offers
   it as `verify` instead, use that — the search box lists the check by its
   `name:` field. (If neither appears, run CI once on a PR first so GitHub
   registers the check name, then it becomes searchable.)
7. Do NOT add `E2E (Playwright)` — it is informational, not gating.
8. Enable **Require a pull request before merging** + set required reviewers
   to at least 1 (owner).
9. (Optional) Enable **Require conversation resolution before merging**.
10. (Optional) Enable **Require linear history** (keeps main rebase-clean).
11. Click **Create** / **Save changes**.

## Verify the rule is live

- Open any open PR → the merge button should be blocked until `verify` is green.
- On the PR's "Checks" tab, `E2E (Playwright)` may or may not appear (weekly
  schedule / manual only) — its absence or yellow state must not block merge.
- If a maintainer needs to emergency-bypass, use the **"Include administrators"
  OFF** setting (admins can then push directly in a genuine hotfix) — but log
  the bypass in the commit message and re-run `verify` on main immediately after.

## Why a repo file can't do this

GitHub branch protection lives in the GitHub API/settings, not in `.github/`.
There is no equivalent of `.github/CODEOWNERS`-style file enforcement for
required checks. Treating this as a one-time ops task (steps above) is the
documented approach.
