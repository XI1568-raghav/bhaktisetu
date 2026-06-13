# Sentry Source Maps Upload + Release Tracking — Web + API

> **Roadmap item**: R-Q2-E-015 (P2) · **Authored**: 2026-06-13 · **Extends**: R-Q1-IT-003 Sentry

## Goal

Q2 upload source maps + tag releases. De-obfuscate stack traces in Sentry.

## Web (Next.js)

```bash
pnpm --filter @poojly/web add @sentry/nextjs
```

`next.config.ts`:
```typescript
withSentryConfig(nextConfig, {
  org: 'bhaktisetu',
  project: 'bhaktisetu-web',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  hideSourceMaps: true,  // don't expose source maps publicly
  release: process.env.RELEASE_SHA ?? process.env.CF_PAGES_COMMIT_SHA,
})
```

## API (Node)

`apps/api/Dockerfile` build step:
```bash
RUN pnpm exec sentry-cli releases new $RELEASE_SHA
RUN pnpm exec sentry-cli releases files $RELEASE_SHA upload-sourcemaps ./dist
RUN pnpm exec sentry-cli releases deploys $RELEASE_SHA new -e production
```

## CF Pages env

`SENTRY_AUTH_TOKEN` set in CF Pages env w/ `project:write` scope.

## Release tagging

Per deploy:
- CF Pages commit SHA = release name
- Tag in Sentry → can filter errors by release
- Regression detection: error appears only in latest release → red flag

## Engineering tickets

- R-Q2-E-015a: Sentry CLI integration in CF Pages build
- R-Q2-E-015b: Sentry CLI in Render Docker build
- R-Q2-E-015c: Release auto-tagging on deploy
- R-Q2-E-015d: Source map verification post-deploy

## Closes

R-Q2-E-015 — spec shipped.
