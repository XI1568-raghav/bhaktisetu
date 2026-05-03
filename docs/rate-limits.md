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

## Tuning

When pushing limits up: prefer per-route override via Fastify `{ config: { rateLimit } }` rather than editing the global hook. Keeps policy local.

## Future

- Move counters to Redis once multi-instance (Render Pro)
- Add abuse-IP blocklist + Cloudflare WAF rule for repeat offenders
- Distinct quotas per subscription tier (Premium gets 10× higher)
