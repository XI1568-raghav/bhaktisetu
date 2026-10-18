import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache';

// OpenNext adapter config for the Cloudflare Workers build (`pnpm build:cf`).
// Dev tooling only: the default `build` / Render Docker path never reads this.
//
// buildCommand is explicit so the adapter does not call `pnpm build` (which would
// be fine today, but would silently follow any future change to the Render build).
// Incremental cache = Workers static assets (free, read-only): prerendered pages are
// served from the build output instead of re-rendered per request (10 ms CPU cap).
// Trade-off: no ISR revalidation; content changes need a redeploy. See docs/runbooks/cloudflare-web-deploy.md.
const config = defineCloudflareConfig({ incrementalCache: staticAssetsIncrementalCache });
config.buildCommand = 'node scripts/build-search-index.mjs && next build';

export default config;
