# Sentry release tracking (TD7)

Each push to `main` tags a Sentry release named `darshya@<git-sha>` and uploads
sourcemaps for `web`, `api`, and `mobile`. This makes Sentry stack traces map
to the original TypeScript and lets us see which deploy introduced an error.

## How it works

`.github/workflows/sentry-release.yml` runs on every push to `main`:

1. Skips entirely when the `SENTRY_AUTH_TOKEN` repo secret is not set.
2. Computes `SENTRY_RELEASE=darshya@${{ github.sha }}`.
3. `sentry-cli releases new $RELEASE` — registers the release.
4. `sentry-cli releases set-commits --auto` — links the release to commits since
   the last release (uses GitHub integration; falls back gracefully).
5. Builds each app with `SENTRY_RELEASE` injected as a public env var so the
   running app reports the same release identifier as the sourcemaps.
6. `sentry-cli sourcemaps upload --release $RELEASE <build-output>` for each of
   `darshya-web`, `darshya-api`, `darshya-mobile`. Failures are logged but do
   not fail the workflow (mobile bundle export is best-effort).
7. `sentry-cli releases finalize $RELEASE` — locks the release.
8. `sentry-cli releases deploys $RELEASE new -e production` — records the
   deploy so Sentry's "Deploys" tab shows when each release went live.

## Required env vars

| Name                     | Where                              | Notes                                      |
| ------------------------ | ---------------------------------- | ------------------------------------------ |
| `SENTRY_AUTH_TOKEN`      | GitHub Actions repo secret         | Org-scoped token with `project:releases` + `project:write`. Without it the workflow no-ops. |
| `SENTRY_DSN`             | Render env (api)                   | Already set; init reads it.                |
| `NEXT_PUBLIC_SENTRY_DSN` | Cloudflare Pages env (web)         | Already set; init reads it.                |
| `EXPO_PUBLIC_SENTRY_DSN` | EAS / app env (mobile)             | Already set; init reads it.                |
| `NEXT_PUBLIC_SENTRY_RELEASE` | injected at build time         | Set automatically by the workflow.         |
| `SENTRY_RELEASE`         | injected at build time (api)       | Set automatically by the workflow.         |
| `EXPO_PUBLIC_SENTRY_RELEASE` | injected at build time (mobile)| Set automatically by the workflow.         |

The Sentry SDK init in each app reads its release env var and tags every
captured error with it. See:

- `apps/web/lib/sentry.ts`
- `apps/api/src/lib/sentry.ts`
- `apps/mobile/lib/sentry.ts`

## Viewing a release in Sentry

1. <https://darshya.sentry.io/releases/>
2. Click the release `darshya@<sha>` — you'll see:
   - Linked commits (from `set-commits --auto`)
   - Files / sourcemaps uploaded per project
   - "First seen" / "Last seen" issues introduced in this release
   - Deploy history (production environment, with timestamp)

## Reverting a bad release

A "release" in Sentry is metadata, not a deploy mechanism.

> **OPS-06 correction (2026-08-28).** This section used to say *revert the
> commit and let CI deploy the new HEAD*:
>
> ```bash
> git revert <bad-sha>
> git push origin main     # ← THIS DEPLOYS NOTHING
> ```
>
> **There is no CI that deploys from `main`.** `render.yaml` sets
> `autoDeploy: false` on both services (`:28` API, `:60` web), and no workflow
> in this repository deploys on push — `deploy-web-render.yml` is a Docker
> smoke build that never touches the Render service. Pushing a revert changes
> the git history and leaves the bad bytes serving traffic, while Sentry
> unhelpfully shows a new release as if something shipped.

**Authoritative procedure: [`docs/runbooks/prod-rollback.md`](runbooks/prod-rollback.md).**
Rolling back means explicitly deploying an older commit:

```bash
gh workflow run render-diag.yml -f mode=deploys -f sid=<SID>   # find last good SHA
gh workflow run render-diag.yml -f mode=deploy  -f sid=<SID> -f commit=<SHA>
gh run watch
```

API `srv-d7mc2n8sfn5c73dfce0g` · web `srv-d970l2ks728c738fc33g`.

Whichever commit you deploy becomes the running release. If you also push a
revert commit for history's sake, remember that the push is bookkeeping — the
deploy above is what actually rolls back. The bad release stays in Sentry's
history for forensics; you can mark it "Resolved in next release" once the
replacement is deployed and live.

If you only want to suppress alerts for the bad release without reverting, use
the Sentry UI: open the release, set its status to `archived`, and any new
issues "First seen" in that release are deprioritised.

## Manual one-off release

For local debugging or emergency hot-fixes:

```bash
export SENTRY_AUTH_TOKEN=...
export SENTRY_RELEASE="darshya@$(git rev-parse HEAD)"
npx @sentry/cli releases new "$SENTRY_RELEASE"
npx @sentry/cli sourcemaps upload --org darshya --project darshya-web \
  --release "$SENTRY_RELEASE" apps/web/.next
npx @sentry/cli releases finalize "$SENTRY_RELEASE"
npx @sentry/cli releases deploys "$SENTRY_RELEASE" new -e production
```
