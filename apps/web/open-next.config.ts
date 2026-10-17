import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// OpenNext adapter config for the Cloudflare Workers build (`pnpm build:cf`).
// Dev tooling only: the default `build` / Render Docker path never reads this.
//
// buildCommand is explicit so the adapter does not call `pnpm build` (which would
// be fine today, but would silently follow any future change to the Render build).
// Default incremental cache (no R2/KV/D1): pages are prerendered at build time and
// shipped as static output; ISR revalidation is not durable until an R2/KV cache
// override is added. See docs/runbooks/cloudflare-web-deploy.md.
const config = defineCloudflareConfig({});
config.buildCommand = 'node scripts/build-search-index.mjs && next build';

export default config;
