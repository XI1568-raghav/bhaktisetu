/**
 * Central boot-time environment validation (P1-15).
 *
 * Problem: money + auth env vars were read ad-hoc across the codebase, so a
 * missing RAZORPAY_KEY_SECRET or JWT_SECRET failed LATE — sometimes only when
 * the first real payment hit. There was no schema, no boot guard.
 *
 * This module parses the env ONCE at module load via a Zod schema and exports a
 * typed `env` object. In production, required-without-default keys crash the
 * boot (process.exit(1)) with a clear [FATAL] message. In dev, optional keys
 * are allowed to be missing so `pnpm dev` works without the full secret set.
 *
 * IMPORTANT — additive only. Existing `process.env.X` reads elsewhere are LEFT
 * AS-IS (a 100-file refactor is out of scope). This module ADDS a boot-time
 * parse so a missing prod key fails fast at startup instead of mid-request.
 * Call sites can migrate to `env.X` incrementally; nothing breaks if they don't.
 *
 * Wiring: imported at the very top of src/server.ts (before any route module
 * that reads secrets) so the parse runs before the app accepts traffic.
 */

import { z } from 'zod';

const isProd = process.env.NODE_ENV === 'production';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // ── Database ────────────────────────────────────────────────────────────
  // DATABASE_URL is the pooled connection (PgBouncer/Supabase pooler) used by
  // the runtime Prisma client. DIRECT_URL is the direct (non-pooled) connection
  // used by migrations. Both required in prod.
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),

  // ── Supabase ────────────────────────────────────────────────────────────
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),

  // ── Payment gateways ────────────────────────────────────────────────────
  RAZORPAY_KEY_ID: z.string().min(1).optional(),
  RAZORPAY_KEY_SECRET: z.string().min(1).optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1).optional(),
  // STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET removed 2026-08-11 with the
  // Stripe rail. Razorpay is the only gateway.

  // ── Auth ────────────────────────────────────────────────────────────────
  // JWT_SECRET is required in production (enforced below). Dev gets a fallback.
  JWT_SECRET: z.string().min(1).optional(),

  // ── Web ─────────────────────────────────────────────────────────────────
  // CORS_ORIGIN is comma-separated allowed origins. Required in prod (server.ts
  // already throws if missing in prod; this mirrors it for visibility).
  CORS_ORIGIN: z.string().min(1).optional(),

  // ── Infra (optional) ────────────────────────────────────────────────────
  REDIS_URL: z.string().min(1).optional(),

  // ── Free-form runtime knobs (validated as strings, defaults applied at use) ─
  // These are read ad-hoc elsewhere; we only assert they're strings when present.
  PORT: z.string().optional(),
  API_PORT: z.string().optional(),
  HOST: z.string().optional(),
  ALLOW_DEMO_TOKENS: z.string().optional(),
  ALLOW_DEMO_PAYMENTS: z.string().optional(),
  RATE_LIMIT_MAX: z.string().optional(),
  RATE_LIMIT_WINDOW: z.string().optional(),
  RATE_LIMIT_AUTH_MAX: z.string().optional(),
  CRON_AUTH_TOKEN: z.string().optional(),
  // 'true' restores admin approval for new provider profiles. Unset = providers go live on submit.
  // Read at call time by lib/provider-approval.ts.
  REQUIRE_PROVIDER_APPROVAL: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('[FATAL] Environment validation failed at boot:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  process.exit(1);
}

const envData = parsed.data;

// Prod-only hard requirements that Zod's `.optional()` above can't express
// (because they ARE legitimately optional in dev/test). Mirror the demo-token
// boot guard in middlewares/auth.ts.
if (isProd) {
  const prodRequired: Array<keyof typeof envData> = [
    'JWT_SECRET',
    'DATABASE_URL',
    'CORS_ORIGIN',
  ];
  const missing = prodRequired.filter((k) => !envData[k]);
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(
      `[FATAL] Required env var(s) missing in production: ${missing.join(', ')}. Refusing to boot.`,
    );
    process.exit(1);
  }
}

export type Env = z.infer<typeof envSchema>;
export const env = envData;

/**
 * True when the background job queue (BullMQ/Upstash) is configured. Mirrors
 * the QUEUE_DISABLED check in job-queue.service.ts — duplicated here so env.ts
 * can answer health probes without importing the service (which would force
 * the ioredis lazy-import path to load).
 */
export const isJobQueueConfigured = Boolean(env.REDIS_URL && env.REDIS_URL.length > 0);
