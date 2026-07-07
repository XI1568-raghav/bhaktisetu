import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// OpenNext adapter config for @opennextjs/cloudflare (Workers, not Pages).
// Migrated from @cloudflare/next-on-pages on 2026-07-07 — next-on-pages is
// archived and can't build Next 15.5.x (prerender-manifest v4 incompat), which
// had the CF Pages production deploy red for ~3 weeks.
//
// Default incremental cache (no R2/D1 override) keeps this free-tier safe:
// OpenNext's default Workers Cache + the self-reference service binding in
// wrangler.jsonc handle ISR/revalidate without paid bindings. Enable the R2
// incremental-cache override only if ISR regeneration needs durable cross-
// region storage — see https://opennext.js.org/cloudflare/caching.
export default defineCloudflareConfig({});
