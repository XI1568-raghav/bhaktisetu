# Mobile Environment Variables

All Expo client-side env vars must be prefixed `EXPO_PUBLIC_*` to be embedded in the JS bundle. Anything without that prefix is **not** available at runtime on device.

Per Darshya convention (`docs/env-vars.md`): every integration must check for the env var and no-op if missing. Never crash on absent config.

## Required for production builds

| Var | Purpose | Where to get | If missing |
|-----|---------|--------------|------------|
| `EXPO_PUBLIC_API_URL` | Base URL for Fastify API | Set in `eas.json` per profile (currently `https://api.darshya.online`) | Falls back to `http://localhost:4000` (dev only) |

## Required for paid features

| Var | Purpose | Where to get | If missing |
|-----|---------|--------------|------------|
| `EXPO_PUBLIC_RAZORPAY_KEY_ID` | Razorpay checkout SDK key (public, not secret) | Razorpay Dashboard → Settings → API Keys → Key ID | Booking flow shows "Payments unavailable" toast, blocks checkout |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL for storage/realtime | Supabase Dashboard → Settings → API → Project URL (`https://hlkvfarvfblhzhhnhtbp.supabase.co`) | Storage features (avatar upload, video proof viewing) silently skip |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon JWT | Supabase Dashboard → Settings → API → anon public | Same as above |

## Optional / observability

| Var | Purpose | Where to get | If missing |
|-----|---------|--------------|------------|
| `EXPO_PUBLIC_POSTHOG_KEY` | Product analytics | PostHog → Project Settings → API Key (`phc_*`) | Events are dropped silently |
| `EXPO_PUBLIC_POSTHOG_HOST` | PostHog ingestion host | Default: `https://us.i.posthog.com` | Defaults to US cloud |
| `EXPO_PUBLIC_SENTRY_DSN` | Crash + error reporting | Sentry → Settings → Projects → darshya-mobile → Client Keys (DSN) | Crashes only logged to device console |

## NOT exposed to mobile (server-only — never set with `EXPO_PUBLIC_`)

These exist on `apps/api` and must never appear in mobile bundle:

- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `GROQ_API_KEY`
- `RESEND_API_KEY`
- `DATABASE_URL`

If you accidentally prefix one of these `EXPO_PUBLIC_`, it ships to every user's phone. **Audit `apps/mobile/.env.local` before every build.**

## Where to set them

### Local dev (Expo Go on physical device)
`apps/mobile/.env.local` (gitignored, copy from `.env.example`)

### EAS preview / production builds
`apps/mobile/eas.json` → `build.{profile}.env.*`

Example:
```json
"production": {
  "env": {
    "EXPO_PUBLIC_API_URL": "https://api.darshya.online",
    "EXPO_PUBLIC_RAZORPAY_KEY_ID": "rzp_live_XXXXXXXX",
    "EXPO_PUBLIC_POSTHOG_KEY": "phc_XXXXXXXX",
    "EXPO_PUBLIC_SENTRY_DSN": "https://xxxx@xxx.ingest.sentry.io/xxx"
  }
}
```

For secrets you don't want in git, use EAS secrets:
```bash
pnpm dlx eas-cli@latest secret:create --scope project --name EXPO_PUBLIC_RAZORPAY_KEY_ID --value rzp_live_XXX
```

EAS secrets override `eas.json` env values at build time.

## Verification checklist

Before publishing a production build:

- [ ] `EXPO_PUBLIC_API_URL` resolves to `https://api.darshya.online`
- [ ] `EXPO_PUBLIC_RAZORPAY_KEY_ID` starts with `rzp_live_` (not `rzp_test_`)
- [ ] No server secrets accidentally prefixed `EXPO_PUBLIC_`
- [ ] `pnpm dlx eas-cli@latest secret:list` shows expected entries
- [ ] Sentry DSN is the **mobile** DSN, not the web/api DSN

## Cross-reference

- Server env vars: `docs/env-vars.md`
- EAS build steps: `docs/mobile-eas-setup.md`
- Mobile parity plan: `docs/mobile-plan.md`
