# API Rate Limits (TD6)

Per-route rate limit policy applied via `onRoute` hook in `apps/api/src/server.ts`.

## Policy table

| Route prefix | Limit | Per | Why |
|---|---|---|---|
| `/auth/*` (login, signup, OTP) | 10/min | IP | Brute-force prevention |
| `/ai/chat` | 20/min | user | Groq cost throttle |
| `/bookings/create-order` | 30/min | user | Razorpay order spam guard |
| `/bookings/verify-payment` | 30/min | user | Same |
| `/donations/create-order` | 10/min | user | Donation spam guard |
| `/admin/*` | 60/min | user | Admin pagination headroom |
| `/affiliate/click` | 60/min | IP | Affiliate spam |
| `/api/v2/marketplace/*` | per-key (60-600/min) | API key | Set in marketplace-v2.ts |
| Everything else | 100/min | user (or IP) | Global fallback |

## Key generation

- Authenticated requests: `u:<userId>` partition.
- Anonymous: `ip:<request.ip>` partition.
- Marketplace: `mk:<api_key_hash>`.

This means a single IP shared by many real users (offices, NAT, mobile carriers) doesn't collide once they authenticate.

## On exceeded

- Returns HTTP 429 with `{ error: 'Rate limit exceeded' }`
- Logs `rate_limit_exceeded` event via Pino
- Sentry breadcrumb auto-attached on next captured exception in same request

## Env knobs (R-Q2-E-013)

| Env var | Default | Effect |
|---|---|---|
| `RATE_LIMIT_MAX` | `100` | Global per-window max for the default fallback bucket. |
| `RATE_LIMIT_WINDOW` | `1 minute` | Window string accepted by `@fastify/rate-limit` (e.g. `30 seconds`, `5 minutes`). |
| `RATE_LIMIT_AUTH_MAX` | `10` | Per-window max for the `/auth/*` prefix. Independent of the global default. |

## Allow-list (never rate-limited)

`/health`, `/ready`, `/metrics` — implemented as a function-form `allowList` in the plugin config. Liveness probes must always succeed so a Render burst can't make the node look down.

## Hook ordering — load-bearing

The per-prefix override `onRoute` hook is registered **before** `@fastify/rate-limit`. The plugin's own `onRoute` hook reads `routeOptions.config.rateLimit` at route-registration time (`node_modules/@fastify/rate-limit/index.js` line 143), so a later-registered override hook is a silent no-op. Don't reorder.

## Tuning

When pushing limits up: prefer per-route override via Fastify `{ config: { rateLimit } }` rather than editing the global hook. Keeps policy local.

## Future

- Move counters to Redis once multi-instance (Render Pro)
- Add abuse-IP blocklist + Cloudflare WAF rule for repeat offenders
- Distinct quotas per subscription tier (Premium gets 10× higher)
