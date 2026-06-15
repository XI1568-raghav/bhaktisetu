# R-Q2-E-015 — Sentry source maps upload + release tracking (web + api)

> Roadmap item: `docs/roadmap/items/Q2/engineering/015-sentry-source-maps-upload-release-tracking-both-we.md`
> Status: scaffolded by agent; flips to `shipped` after founder pastes 1 GH secret + cuts 1 tag.
> Depends on: R-Q1-E-014 (Sentry MCP + Sentry account already created).
> Founder blocker: U6 (Sentry account + auth token from R-Q1-E-014).
> KPI target: `sentry_release_tracking: 1` (one tagged release with source maps uploaded for web + api).

## What this closes

The existing `.github/workflows/sentry-release.yml` workflow runs on `git tag v*` and uploads source maps for three apps (web / api / mobile) via `@sentry/cli sourcemaps upload`. Prior to this scaffold, **the web build never produced source maps** (`productionBrowserSourceMaps: false` in `apps/web/next.config.ts`), so the upload step silently uploaded nothing for the web project. API source maps were already produced by `tsc` (`sourceMap: true` in `apps/api/tsconfig.json`) and uploaded correctly.

This batch:

1. Flips `productionBrowserSourceMaps: true` so Next.js emits `.map` files alongside chunks. Bundle size impact: zero — maps are served as separate files, never bundled into JS workers. Cloudflare Pages 3 MiB worker limit unaffected.
2. Adds `apps/web/lib/release.ts` — single source of truth for `NEXT_PUBLIC_SENTRY_RELEASE`. Exports `getRelease() / getReleaseShortSha() / hasReleaseTag()` for footer build-id badges, browser-side error beacons, and request-context logging.
3. Adds `apps/web/__tests__/release.test.ts` covering env-or-noop fallback.
4. Surfaces this handoff doc so the founder can complete in ≤10 min.

## Pre-work owner needs (one-time)

### 1. Sentry project for web (if not already present)

Check `https://sentry.io/organizations/darshya/projects/` — you should see `bhaktisetu-api` from R-Q1-E-014. If `darshya-web` is missing:

1. Sentry UI → Projects → Create Project
2. Platform: **Next.js**
3. Project name: `darshya-web` (must match `--project darshya-web` in the workflow)
4. Alert frequency: default
5. Create

Repeat for `darshya-mobile` if you intend to track Expo bundles.

### 2. GitHub secret — `SENTRY_AUTH_TOKEN`

Reuse the token created in R-Q1-E-014 (scopes: `event:read`, `project:read`, `org:read`, plus `project:releases` and `org:write` for the release CLI).

If you used a narrower scope for MCP, generate a second token:

1. sentry.io → Settings → Account → API → Auth Tokens → Create
2. Scopes: `project:releases`, `org:write`, `project:write`
3. Name: `gh-actions-sentry-release`
4. Copy

Paste into GitHub:

```
gh secret set SENTRY_AUTH_TOKEN --repo XI1568-raghav/bhaktisetu --body 'sntrys_REPLACE_ME'
```

### 3. (Optional) Render env var on API — `SENTRY_RELEASE`

For the running API container to tag its in-process Sentry events with the release that built it, set on Render:

```
SENTRY_RELEASE = darshya@<sha-of-deployed-commit>
```

This must be updated per deploy. If using Render's auto-deploy from `main`, you can omit this — Sentry will receive events tagged `unknown release` but error grouping still works. Tagging gives you "regression introduced in release X" detection. Add a Render post-deploy hook later (out of scope for this scaffold).

## Smoke test

After paste, cut a release tag:

```bash
cd E:/NewClaude/bhaktisetu
git tag v0.1.0-sentry-test
git push origin v0.1.0-sentry-test
```

Watch the run:

```bash
gh run watch --repo XI1568-raghav/bhaktisetu
```

Pass criteria:

- Workflow job `release` exits 0
- "Upload web sourcemaps" step shows `Successfully uploaded X source maps`
- sentry.io → Releases → `darshya@<sha>` exists with three artifacts attached (web .next + api dist + optional mobile dist)
- Triggering a known error from prod (e.g. a route that throws) shows a *symbolicated* stack trace in Sentry instead of `chunk-ABC123.js:1:42891`

## Flip status to shipped

After smoke pass:

```yaml
# docs/roadmap/items/Q2/engineering/015-sentry-source-maps-upload-release-tracking-both-we.md
status: shipped
shipped_at: 2026-06-15T00:00:00Z   # actual UTC
kpi:
  current: 1                        # was 0
```

Commit on next batched docs push (`[skip ci]`, 0 CF burn).

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `web sourcemap upload failed` | `productionBrowserSourceMaps: false` (now fixed) or `.next` missing | Confirm next build succeeded, ls apps/web/.next/static/chunks/*.map |
| `api sourcemap upload failed` | tsc didn't emit `.map` files | Check `apps/api/tsconfig.json` → `"sourceMap": true` |
| Sentry shows release but 0 artifacts | `--project darshya-web` slug mismatch | Verify project slug in sentry.io URL matches workflow YAML |
| `401 Unauthorized` | Token scope missing `project:releases` | Regenerate token with full release scopes |
| Stack traces still minified | Browser source maps emitted but not uploaded under matching URL prefix | Add `--url-prefix '~/_next/'` to the sourcemaps upload step (defer until validated) |

## Why bundle this scaffold despite the prior `@sentry/nextjs` regression?

The Cloudflare Pages 3 MiB worker abort referenced in `next.config.ts` (lines 178-189) was caused by `@sentry/nextjs` auto-bundling `@sentry/node` + OpenTelemetry into every route. This scaffold adds **zero runtime SDK** to the web bundle — only source map emission + a 35-line `release.ts` helper that compiles to <500 bytes. Worker size impact is unmeasurable.

When browser error capture is eventually wanted, the right next step is `@sentry/browser` (pure-browser, tree-shakes cleanly) plus a thin `BrowserSentryInit` client component mounted in `apps/web/app/layout.tsx`. That's a separate roadmap item — out of scope for R-Q2-E-015 which is strictly about release tracking + source map symbolication.

## Related

- `R-Q1-E-014` — Sentry MCP setup (founder reads errors inline)
- `apps/api/src/lib/sentry.ts` — server SDK init (already reads `SENTRY_RELEASE`)
- `.github/workflows/sentry-release.yml` — the workflow this scaffold makes useful for the web app
- `docs/free-tier-budgets.md` — Sentry 5K events/mo free tier ceiling
