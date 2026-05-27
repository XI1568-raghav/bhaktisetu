# Cloudflare Pages Worker Bundle Budget

> **Hard limit: 3 MiB compressed for free tier.** User refuses paid plan ($5/mo). Every edge route counts against this. Read this before adding `runtime = 'edge'` anywhere.

Last updated 2026-05-27. Owner: anyone touching `apps/web/app/`.

## Baseline cost

| Item | Compressed | Notes |
|---|---|---|
| `index.js.wasm` | ~1.30 MiB | Next runtime, fixed |
| webpack runtime chunk | ~0.68 MiB | shared deps, fixed |
| **Subtotal** | **~1.98 MiB** | leaves ~1.02 MiB headroom |

Anything > ~1 MiB of edge route code = build fails CF deploy with `Bundle exceeds 3 MiB` summary (no detailed log on free tier).

## Rules — read before editing

1. **Default to NOT-edge.** A new `page.tsx` should be Static (○) or SSG (●). Only add `export const runtime = 'edge';` if the route MUST run per-request server logic (auth gate, signed cookies, real-time fetch with user-specific headers).
2. **A page that only reads static data → SSG.** Use `generateStaticParams` + `export const dynamicParams = false;`. Drops out of worker.
3. **A `'use client'` page does NOT need edge.** Client components hydrate in browser. The SSR shell can be Static.
4. **A page that fetches public data → use `revalidate` + ISR**, not edge. If the host can't ISR, fetch from a client component or move fetch to API route.
5. **Avoid heavy imports in edge routes:** `stripe`, full `lucide-react` (use per-icon import), `marked`/`remark`, `prismjs`, `date-fns` (use Intl), `framer-motion`, anything > 50 KiB minified.
6. **Per `next build` legend in apps/web output:**
   - `○ (Static)` — prerendered HTML, **not in worker** ✅
   - `● (SSG)` — prerendered HTML per param, **not in worker** ✅
   - `ƒ (Dynamic)` — edge function, **bundled into worker** ⚠️

## View-pattern playbook

When `[id]/page.tsx` is `'use client'` + edge (auth shell + dynamic param), the SSR shell still bundles into the worker. Trick: move it to `view/page.tsx` reading from `?id=` via `useSearchParams()`, then redirect old paths.

**Steps:**
1. Rename `app/foo/[id]/page.tsx` → `app/foo/view/page.tsx`.
2. Replace `useParams()` → `useSearchParams()`. Read `(sp.get('id') ?? '') as string`.
3. **Suspense boundary required** (Next 15): wrap the `useSearchParams` consumer in `<Suspense>`. Default export = wrapper, inner function = body.
4. Add `_redirects` rules (in this order):
   ```
   /foo/view    /foo/view              200   # exact match first (else swallowed)
   /foo/:id     /foo/view?id=:id       302   # bookmark preservation
   ```
5. Fix import depths — moving up/down a folder = `../` adjustment in every import. Run `pnpm build` to verify.

**Currently-applied view-pattern routes** (DO NOT recreate `[id]` variants):
- `/support/tickets/view` (was `/support/tickets/[id]`)
- `/pujas/book` (was `/pujas/[slug]/book`)
- `/pujas/home-puja/book` (was `/pujas/home-puja/[slug]/book`)
- `/astrology/view` (was `/astrology/[id]`)
- `/checkout/offering` (was `/checkout/offering/[offeringId]`)
- `/yatra/book` (was `/yatra/[slug]/book`)
- `/store/view` (was `/store/[handle]`)
- `/priest/bookings/view`, `/admin/support/view`, `/admin/users/view`, `/bookings/view`, `/onboarding/view`

## `_redirects` order rule

CF evaluates top-to-bottom, **first match wins**. Named placeholders (`:name`) match a single segment. Wildcards (`*` / `:splat`) match multi-segment.

**Always list exact-match siblings BEFORE wildcard:**
```
/store/cart       /store/cart           200   ✅ exact first
/store/checkout   /store/checkout       200
/store/:handle    /store/view?handle=:handle  302   ⚠️ swallows everything else after
```

If you reverse it, `/store/cart` gets rewritten to `/store/view?handle=cart` → broken page.

## Pre-commit check

Before pushing a PR that adds/edits pages:

```bash
# Count edge routes
find apps/web/app -name 'page.tsx' -exec grep -l "runtime = .edge." {} \; | wc -l

# Any NEW edge routes?
git diff --cached -- apps/web/app | grep "^\+export const runtime"
```

If you added a new edge route, ask: does this need edge? Could it be Static/SSG instead? Could the dynamic part move to a client component?

## When CF deploy fails with "Build failed" only

CF Pages free tier doesn't expose detailed build logs to non-paid users. If `Build failed` summary lands:

1. **Most likely cause: bundle > 3 MiB.** Run `pnpm build` locally first; CF mirrors local Next output. Look at `apps/web/.next/server/app/` for big route folders.
2. **Pick the heaviest edge route from `next build` output** (the `Size` + `First Load JS` columns). Apply view-pattern or strip edge.
3. **WSL required for `next-on-pages`.** No way to measure compressed worker size on Windows. Push small batches and watch the CF check.

## Forbidden in edge routes

- `import Stripe from 'stripe'` — bundles whole SDK
- `import * as Icons from 'lucide-react'` — use `import { X } from 'lucide-react'`
- `marked`, `remark`, `rehype` — replaced with hand-rolled markdown in `apps/web/app/blog/[slug]/page.tsx`
- `prismjs` — none used; keep it that way
- `date-fns` — use `Intl.DateTimeFormat` + native Date
- Server-only deps: `@prisma/client`, `pg`, `redis` (these belong in `apps/api/`)

## Failure modes seen

| Date | Commit | Cause | Fix |
|---|---|---|---|
| 2026-05-27 | ff2238b, 0fc3dbc | bundle > 3 MiB after Stripe Elements + Suspense additions | view-pattern + strip edge on 9 SSR-only pages |
| 2026-05-21 | (multiple) | `[id]` dynamic routes missing `runtime = 'edge'` → CF couldn't deploy | `docs/caveats.md` — every dynamic route needs edge OR generateStaticParams |

Note the 2026-05-21 caveat is now SUPERSEDED for routes where view-pattern applies. Prefer view-pattern → drops out of worker entirely. Add edge only when neither static nor view-pattern works.
