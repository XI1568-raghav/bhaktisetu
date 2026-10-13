import type { NextConfig } from 'next';

// ─── SEC-01 — security headers Render actually serves ─────────────────────────
//
// darshya.online shipped NO security headers at all: no CSP, no HSTS, no
// X-Frame-Options, no X-Content-Type-Options, no Referrer-Policy. Verified
// against production on 2026-08-19.
//
// The declarations were not missing — they were in `apps/web/public/_headers`,
// which is a CLOUDFLARE PAGES / Workers-Static-Assets mechanism. This app was
// cut over to Render (`output: 'standalone'` + apps/web/Dockerfile, see the
// comment below), and the Render Node server has no concept of that file: it is
// served as a plain static asset at /_headers and otherwise ignored. Every
// header in it has been inert since the cutover, so the file is a decoy that
// makes the app look hardened while it is not.
//
// `headers()` below is the one mechanism Render honours, because Next itself
// implements it. `_headers` is left in place for now (a separate lane owns
// deleting it) but is NO LONGER the source of truth — the parity test in
// __tests__/sec01-security-headers.test.ts fails if the two drift.
//
// Middleware was the other candidate and was rejected: middleware.ts's matcher
// deliberately excludes `_next/*` and anything with a file extension, so
// scripts, fonts and images would have gone out bare. next.config `headers()`
// covers every response the server emits.

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * The origin the browser is allowed to talk to for API calls.
 *
 * `_headers` hardcoded `https://api.darshya.online`, which silently breaks any
 * preview/staging deploy pointed at a different API — the CSP would block every
 * XHR with no server-side signal at all. Derived from the same env var
 * lib/api-config.ts resolves so the two can never disagree.
 */
function apiOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

/**
 * Build the CSP.
 *
 * The production source lists are EXACTLY what public/_headers declared, plus
 * the configured API origin and an explicit `worker-src` for /public/sw.js.
 * Nothing was tightened here: this policy has never actually been enforced on
 * Render, so the first deploy that serves it is the first time the app runs
 * under it. Tightening (dropping 'unsafe-inline' for a nonce, say) is a second,
 * separately verifiable step — doing both at once turns any mistake into an
 * unattributable white screen.
 *
 * `'unsafe-inline'` in script-src is load-bearing, not laziness: Next 15
 * inlines its bootstrap and flight-payload scripts and this app has no nonce
 * plumbing. Removing it ships HTML that never hydrates.
 *
 * Development relaxes three things and only three:
 *   - `'unsafe-eval'`, which the dev bundler (webpack eval-source-map, and
 *     Turbopack's HMR runtime) requires;
 *   - ws:/wss: + http://localhost:* in connect-src, for HMR and a local API on
 *     :4000;
 *   - no `upgrade-insecure-requests`, which would rewrite every
 *     http://localhost call to https and break local dev outright.
 */
function buildContentSecurityPolicy(isProduction: boolean): string {
  const api = apiOrigin();
  const devConnect = isProduction
    ? []
    : ['ws:', 'wss:', 'http://localhost:*', 'http://127.0.0.1:*'];

  const directives: Array<[string, string[]]> = [
    ['default-src', ["'self'"]],
    [
      'script-src',
      [
        "'self'",
        "'unsafe-inline'",
        ...(isProduction ? [] : ["'unsafe-eval'"]),
        'https://checkout.razorpay.com',
        'https://*.posthog.com',
        'https://www.googletagmanager.com',
        'https://connect.facebook.net',
        'https://cdn.razorpay.com',
        'https://static.cloudflareinsights.com',
        'https://pagead2.googlesyndication.com',
        'https://*.googlesyndication.com',
        'https://*.doubleclick.net',
        'https://googleads.g.doubleclick.net',
      ],
    ],
    ['style-src', ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']],
    ['font-src', ["'self'", 'data:', 'https://fonts.gstatic.com']],
    [
      'img-src',
      [
        "'self'",
        'data:',
        'blob:',
        'https:',
        ...(isProduction ? [] : ['http://localhost:*', 'http://127.0.0.1:*']),
      ],
    ],
    [
      'connect-src',
      [
        "'self'",
        'https://api.darshya.online',
        ...(api && api !== 'https://api.darshya.online' ? [api] : []),
        'https://*.supabase.co',
        'https://*.ingest.sentry.io',
        'https://*.sentry.io',
        'https://*.posthog.com',
        'https://api.razorpay.com',
        'https://lumberjack.razorpay.com',
        'https://www.google-analytics.com',
        'https://*.facebook.com',
        'https://*.doubleclick.net',
        'https://*.googlesyndication.com',
        ...devConnect,
      ],
    ],
    [
      'frame-src',
      [
        "'self'",
        'https://checkout.razorpay.com',
        'https://api.razorpay.com',
        'https://www.youtube.com',
        'https://www.youtube-nocookie.com',
        'https://meet.jit.si',
        'https://*.doubleclick.net',
        'https://googleads.g.doubleclick.net',
        'https://*.googlesyndication.com',
      ],
    ],
    ['media-src', ["'self'", 'blob:', 'https:']],
    // public/sw.js. Without this it falls back through child-src to
    // default-src, which happens to allow it — stated explicitly so a later
    // default-src change cannot silently kill push notifications.
    ['worker-src', ["'self'"]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'", 'https://checkout.razorpay.com', 'https://api.razorpay.com']],
    ['frame-ancestors', ["'none'"]],
  ];

  const serialized = directives.map(([name, sources]) => `${name} ${sources.join(' ')}`);
  if (isProduction) serialized.push('upgrade-insecure-requests');
  return serialized.join('; ');
}

/**
 * The policy as it will be SERVED IN PRODUCTION, regardless of the NODE_ENV the
 * caller happens to be running under. Exported so a test can assert the dev
 * relaxations never leak into the shipped policy — under vitest NODE_ENV is
 * 'test', so reading the ambient value would prove nothing.
 */
export function productionContentSecurityPolicy(): string {
  return buildContentSecurityPolicy(true);
}

const SECURITY_HEADERS: Array<{ key: string; value: string }> = [
  { key: 'Content-Security-Policy', value: buildContentSecurityPolicy(IS_PRODUCTION) },
  // Browsers ignore HSTS delivered over http, so this is inert on localhost and
  // needs no environment gate. `preload` matches what _headers already
  // committed to and the site has been https-only behind Cloudflare throughout.
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  // Belt and braces with `frame-ancestors 'none'` — XFO is what pre-CSP
  // browsers and some corporate proxies still act on.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(self), geolocation=(self), payment=(self)',
  },
];

const nextConfig: NextConfig = {
  // Self-host on Render (Node free tier) — OpenNext/Cloudflare Workers was
  // abandoned 2026-07-07: the OpenNext server-function bundle (5.3 MiB gzip)
  // exceeded the free Workers 3 MiB limit and the app uses no CF bindings in
  // prod. `standalone` produces a self-contained server.js + minimal deps so
  // the Docker image runs `node server.js` directly. See apps/web/Dockerfile.
  output: 'standalone',
  transpilePackages: ['@poojly/ui', '@poojly/shared', '@poojly/api-client'],
  typescript: {
    // pnpm hoists @types/react@18 (mobile) alongside @types/react@19 (web),
    // and Next 15's webpack-side typechecker resolves to 18 for some files
    // (Suspense / SuspenseProps shape diff). Real type-check still gates CI
    // via `turbo type-check` running on the per-app tsconfigs.
    ignoreBuildErrors: true,
  },
  images: {
    // Historically `unoptimized: true` because Cloudflare Pages couldn't run
    // Next's default image optimizer. Cloudflare is now out (self-host on
    // Render Node via `output: 'standalone'`, where the optimizer WOULD work),
    // but the flag is kept: on the free-tier Node box, sharp-based on-the-fly
    // optimization adds CPU per request and free-tier RAM is tight. An
    // unbounded optimizer in front of arbitrary remote URLs is its own
    // availability risk on a single 512 MB container.
    //
    // 2026-08-13 correction — the old justification here ("remote images are
    // already served optimized from Supabase/CloudFront") was false. 100% of
    // them are Wikimedia Commons files, and measured at a 375px viewport the
    // app was shipping 29,056 KB of images on /store, 25,658 KB on /pujas,
    // 16,131 KB on /gaushala and 14,815 KB on /. The optimizer was never what
    // stood between a 6016x4000 original and a phone.
    //
    // What replaces it: every remote URL now goes through `remoteImage()` in
    // lib/images.ts, which asks the ORIGIN's own resizer (Commons /thumb/,
    // Unsplash w/h params) for the slot width, and `remoteSrcSet()` emits a
    // srcset so a 375px phone takes the 500px candidate. That costs this
    // container zero CPU. Flipping `unoptimized` to false is therefore no
    // longer the lever it looks like — only 4 call sites use next/image at
    // all, and all four opt out individually. Revisit only alongside the
    // self-host-vs-CDN decision, not on its own.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'commons.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: '**.archive.org',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: '**.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
    ],
  },
  experimental: {
    // TD3 — extended optimize list. These libs are tree-shake friendly under
    // Next 15 modular optimization. Reduces initial JS bundle significantly.
    optimizePackageImports: [
      'lucide-react', 'date-fns', '@tanstack/react-query', 'lodash',
      'react-icons', 'recharts', 'framer-motion', '@radix-ui/react-icons',
    ],
    webpackBuildWorker: false,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  // Sentry release tracking (R-Q2-E-015) originally set this to `true` so the
  // Sentry Release workflow could upload source maps. DISABLED 2026-07-07:
  // no Sentry release tag has ever been cut (sentry-release.yml is tag-triggered
  // and skips gracefully when SENTRY_AUTH_TOKEN is absent), so the maps were
  // generated on every build for zero benefit. Originally also disabled because
  // @cloudflare/next-on-pages had documented build failures with browser source
  // maps. The Cloudflare adapters (next-on-pages + @opennextjs/cloudflare) are
  // now fully removed (self-host on Render via `output: 'standalone''), so the
  // adapter-incompatibility reason is gone — but the flag stays off until the
  // Sentry release pipeline is actually wired (auth token set + a v* tag cut);
  // turning maps back on without a release to attach them to is still pointless.
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  // SEC-03: Next sets `X-Powered-By: Next.js` on every response by default,
  // handing an attacker the framework and a version-range hint for free. No
  // behaviour depends on it.
  poweredByHeader: false,
  webpack: (config) => {
    // Workspace packages (@poojly/api-client, @poojly/shared) use NodeNext-style
    // `./foo.js` imports in their TS source. Webpack's default resolver doesn't
    // know to map `.js` → `.ts`. extensionAlias fixes this for bundlers.
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
  async redirects() {
    // Legacy `/kundli` path. Canonical is `/astrology/kundli`.
    // Permanent redirect preserves SEO + survives external inbound links.
    return [
      {
        source: '/kundli',
        destination: '/astrology/kundli',
        permanent: true,
      },
    ];
  },
  async headers() {
    // TD8 — per-route CDN cache rules. Cloudflare honours s-maxage (CDN-only)
    // and stale-while-revalidate, while max-age controls the browser TTL.
    // Intentionally not enumerated here:
    //   - /api/* — handlers set Cache-Control: private, no-cache themselves.
    //   - HTML pages — fall through to per-route Next revalidate config.
    return [
      {
        // SEC-01. Every response, including /_next/* and /public assets, which
        // is why this lives here and not in middleware.ts (whose matcher
        // excludes both). See SECURITY_HEADERS above.
        source: '/:path*',
        headers: SECURITY_HEADERS,
      },
      {
        // iOS Universal Links. Apple fetches this EXACT extensionless path and
        // requires application/json; it does not follow redirects, and
        // X-Content-Type-Options: nosniff (SEC-01 above) rules out sniffing.
        // Next serves public/ through `send`, whose bundled mime@1.6.0 maps an
        // unknown extension to application/octet-stream — measured, not assumed
        // — so without this rule the association file is served with the wrong
        // type and iOS silently refuses to verify the domain. `send` skips its
        // own type() when Content-Type is already set, so this wins.
        // public/_headers is dead code on Render (SEC-01), so this is the only
        // mechanism available. The Android sibling (assetlinks.json) needs no
        // rule: mime resolves .json correctly on its own.
        source: '/.well-known/apple-app-site-association',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
      {
        // The second rule public/_headers declared and Render silently dropped:
        // keep the admin surface out of search indexes. Discoverability only —
        // AuthGuard + the API's requireRole are the actual authorization
        // boundary (see middleware.ts).
        source: '/admin/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
      {
        // AUTH-10 — sign-in HTML must never sit in a shared cache.
        //
        // All seven /auth/* routes are `'use client'` pages with no
        // `revalidate` and no `dynamic` export, so Next prerenders them. For a
        // prerendered app-router page Next derives the response header from
        // `getCacheControlHeader({ revalidate: false })`
        // (next/dist/server/lib/cache-control.js), whose final branch returns
        // `s-maxage=${CACHE_ONE_YEAR}` — a ONE-YEAR shared-cache lifetime on
        // the sign-in shell. Measured on prod 2026-08-11:
        // `/auth/login` -> `Cache-Control: s-maxage=31536000`.
        //
        // Why that is a real outage and not a nit: darshya.online sits behind
        // Cloudflare. Any shared cache holding a PRE-DEPLOY /auth/login shell
        // keeps serving <script src="/_next/static/chunks/…"> URLs the new
        // build no longer emits. The document paints, the chunks 404,
        // hydration never runs — so the Sign In button is inert and its
        // spinner never resolves. That is the owner-reported P0 symptom, and
        // it is unreproducible from a healthy cache, which is why testing
        // against a warm origin kept coming back clean.
        //
        // This belongs here rather than in the pages for two reasons. Render
        // ignores public/_headers (SEC-01), so next.config `headers()` is the
        // only mechanism that reaches a browser. And Next deliberately yields
        // to it — next/dist/server/send-payload.js:
        //     // If cache control is already set on the response we don't
        //     // override it to allow users to customize it via next.config
        //     if (cacheControl && !res.getHeader('Cache-Control')) { … }
        // so this rule, applied before the render, beats the one-year default.
        //
        // `/auth/:path*` also matches the RSC/prefetch payloads for the same
        // pathnames, which carry the same stale-chunk references.
        // Guarded by app/auth/__tests__/auth-cache-control.auth10.test.ts.
        source: '/auth/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, max-age=0, must-revalidate',
          },
        ],
      },
      {
        // Long-cache static image + font assets served from /public.
        // These paths are versioned implicitly by filename, so immutable is safe.
        source: '/:all*\\.(jpg|jpeg|png|webp|avif|svg|ico|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Next build artefacts are content-hashed.
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Slug pages are mostly-static. 5min CDN edge, 1d SWR keeps Cloudflare
        // serving while origin regenerates.
        source: '/temples/:slug',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/pujas/:slug',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/yatra/destinations/:slug',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // SEO surfaces — refresh hourly, serve stale for a day.
        source: '/sitemap.xml',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/robots.txt',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
};

// Browser-side Sentry deferred — even just having @sentry/nextjs in
// dependencies caused Next 15 to auto-bundle @sentry/node + OpenTelemetry
// into every route, which the prior @cloudflare/next-on-pages adapter
// couldn't dedupe across route bundles ("duplicated identifier" abort).
// The package was removed from apps/web/package.json entirely. Server-side
// Sentry on the Render API (uses @sentry/node directly) is unaffected and
// still catching real bugs.
//
// Future: when browser error capture is wanted, add @sentry/browser as
// a small standalone dep — that package is pure-browser and tree-shakes
// cleanly, no Next plugin involvement.
export default nextConfig;
