import { initSentry, captureException } from './lib/sentry.js';
// Initialise Sentry as the very first thing — must come before any
// imports that might throw, so errors during module load are captured.
initSentry();

// P1-15: boot-time env validation. MUST run before any route module that reads
// secrets so a missing prod key (JWT_SECRET, DATABASE_URL, CORS_ORIGIN) fails
// fast at startup instead of mid-request. Additive — does NOT replace the
// ad-hoc `process.env.*` reads elsewhere; just adds a schema parse + prod guard.
import './lib/env.js';

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { clientIp, rateLimitKey } from './lib/rate-limit-key.js';
import { resolveRateLimitPolicy } from './lib/rate-limit-policy.js';
import { resolveCorsOrigins } from './lib/cors-origins.js';
import { startOpsScheduler, getSchedulerStatus } from './jobs/scheduler.js';
import fastifyRawBody from 'fastify-raw-body';
import fastifyCookie from '@fastify/cookie';
import { registerAuthDecorators, authenticateUser, requireRole } from './middlewares/auth.js';
import { ensureSchemaInvariants } from './lib/ensure-schema.js';
import { templeRoutes } from './routes/temples.js';
import { pujaRoutes } from './routes/pujas.js';
import { bookingRoutes } from './routes/bookings.js';
import { paymentRoutes } from './routes/payments.js';
import { contentRoutes } from './routes/content.js';
import { darshanRoutes } from './routes/darshan.js';
import { affiliateRoutes } from './routes/affiliate.js';
import { templePortalRoutes } from './routes/temple-portal.js';
import { astrologerPortalRoutes } from './routes/astrologer-portal.js';
import { wellnessPortalRoutes } from './routes/wellness-portal.js';
import { gaushalaPortalRoutes } from './routes/gaushala-portal.js';
import { gaushalaCowsRoutes } from './routes/gaushala-cows.js';
import { gaushalaVolunteersRoutes } from './routes/gaushala-volunteers.js';
import { userRoutes } from './routes/users.js';
// LC-DEL: in-app account deletion (Apple 5.1.1(v) + Google Play).
import { accountRoutes } from './routes/account.js';
import { readingProgressRoutes } from './routes/reading-progress.js';
import { digestRoutes } from './routes/digest.js';
import { recurringRoutes } from './routes/recurring.js';
import { authRoutes } from './routes/auth.js';
import { subscriptionRoutes } from './routes/subscriptions.js';
import { priestRoutes } from './routes/priest.js';
import { priestsPublicRoutes } from './routes/priests-public.js';
import { adminRoutes } from './routes/admin.js';
import { panchangRoutes } from './routes/panchang.js';
import { storeRoutes } from './routes/store.js';
import { storeAdminRoutes } from './routes/store-admin.js';
import { aiRoutes } from './routes/ai.js';
import { gaushalaRoutes } from './routes/gaushala.js';
import { astrologyRoutes } from './routes/astrology.js';
import { weddingRoutes } from './routes/weddings.js';
import { wellnessRoutes } from './routes/wellness.js';
import { onboardingRoutes } from './routes/onboarding.js';
import { providerRoutes } from './routes/providers.js';
import { providerKycRoutes } from './routes/provider-kyc.js';
import { yatraRoutes } from './routes/yatra.js';
import { yatraPackagesRoutes } from './routes/yatra-packages.js';
import { supportRoutes } from './routes/support.js';
import { searchRoutes } from './routes/search.js';
import { consultationRoutes } from './routes/consultation.js';
import { payoutsRoutes } from './routes/payouts.js';
import { magicLinkRoutes } from './routes/magic-link.js';
import { donationRoutes } from './routes/donations.js';
import { mediaRoutes } from './routes/media.js';
import { whatsappOtpRoutes } from './routes/whatsapp-otp.js';
import { notificationRoutes } from './routes/notifications.js';
import { healthChannelRoutes } from './routes/health-channels.js';
import { reportChannelReadinessAtBoot } from './lib/notification-channels.js';
import { healthRoutes } from './routes/health.js';
import { semanticSearchRoutes } from './routes/semantic-search.js';
import { cronRoutes } from './routes/cron.js';
import { adminCronRoutes } from './routes/admin-cron.js';
import { adminOpsRoutes } from './routes/admin-ops.js';
import { adminMetricsRoutes } from './routes/admin-metrics.js';
import { conversationRoutes } from './routes/conversations.js';
import { demoPayRoutes } from './routes/demo-pay.js';
import { ratingRoutes } from './routes/ratings.js';
import { storeOrderRoutes } from './routes/store-orders.js';
import { wellnessSessionRoutes } from './routes/wellness-sessions.js';
import { outreachWebhookRoutes, outreachAdminRoutes } from './routes/outreach-webhook.js';
import { outreachTrackingRoutes } from './routes/outreach-tracking.js';
import { adminLeadsRoutes } from './routes/admin-leads.js';
import { adminAgentsRoutes, publicAgentFeedRoutes } from './routes/admin-agents.js';
import adminRoadmapRoutes from './routes/admin-roadmap.js';
import adminRoadmapOrchestratorRoutes from './routes/admin-roadmap-orchestrator.js';
import adminSubscriptionsRoutes from './routes/admin-subscriptions.js';
import { adminTemplesRoutes } from './routes/admin-temples.js';
import { adminBookingsRoutes } from './routes/admin-bookings.js';
import { adminGaushalaDisbursementRoutes } from './routes/admin-gaushala-disbursements.js';
import { adminTempleSettlementRoutes } from './routes/admin-temple-settlements.js';
import { adminTempleLinkRoutes } from './routes/admin-temple-links.js';
import { adminLeadConversionRoutes } from './routes/admin-lead-conversion.js';
import { waitlistRoutes } from './routes/waitlist.js';
import { leadsSelfOnboardRoutes } from './routes/leads-self-onboard.js';
import {
  whatsappBroadcastRoutes,
  whatsappWebhookRoutes,
} from './routes/whatsapp-broadcast.js';
import { adminContentQueueRoutes } from './routes/admin-content-queue.js';
import { adminDonationsExportRoutes } from './routes/admin-donations-export.js';
import { adminQueueRoutes } from './routes/admin-queue.js';
import { orgsRoutes } from './routes/orgs.js';
import { marketplaceV2Routes, marketplaceAdminRoutes } from './routes/marketplace-v2.js';
import { csrMatchRoutes } from './routes/csr-match.js';
import { antimSanskarRoutes } from './routes/antim-sanskar.js';
import { lessonsRoutes } from './routes/lessons.js';
import { gurukulsRoutes } from './routes/gurukuls.js';
import { gurukulApplicationsRoutes } from './routes/gurukul-applications.js';
import { gurukulPortalRoutes } from './routes/gurukul-portal.js';
import { adminGurukulsRoutes } from './routes/admin-gurukuls.js';
import { knowledgeRoutes } from './routes/knowledge.js';
import { referralsRoutes } from './routes/referrals.js';
import { b2bRoutes } from './routes/b2b.js';
import { giftPujaRoutes } from './routes/gift-puja.js';
import { yatraInquiryRoutes } from './routes/yatra-inquiry.js';
import { dpdpRoutes } from './routes/dpdp.js';
import { voicePanditRoutes } from './routes/voice-pandit.js';
import { recordLatency, snapshotStats, startMetricsReporter } from './lib/route-metrics.js';
import { prisma } from './lib/prisma.js';
import { instrumentPrisma, registerNPlusOneRequestScope } from './db/instrument-prisma.js';
import { isJobQueueAvailable } from './services/job-queue.service.js';
import { isJobQueueConfigured } from './lib/env.js';
import { errorLocalizationPlugin } from './plugins/error-localization.js';
import { localizeImages } from './lib/self-hosted-images.js';
import { wrapRouteGuards } from './lib/stop-when-answered.js';
import { registerNulByteGuard } from './lib/nul-guard.js';

const server = Fastify({
  logger: {
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
});

async function bootstrap() {
  // Defensive schema check — replays non-idempotent migrations that the
  // Render start command may have skipped. Runs before routes register so
  // hot-path Prisma queries see the columns they expect.
  await ensureSchemaInvariants(server.log);

  // ── Error handler ─── MUST be installed BEFORE any route plugin ───────────
  //
  // AW-08 (prod sweep 2026-08-12, P1). This block used to sit at the BOTTOM of
  // bootstrap(), after ~90 `server.register(routes, { prefix })` calls. Fastify
  // resolves a route's error handler from the encapsulation context the route
  // was registered in, so a handler installed afterwards never reaches any of
  // them — it was dead code for every route in this API, in every environment,
  // and Fastify's default serializer answered instead:
  //
  //   {"statusCode":500,"code":"P2023","message":"Invalid `prisma.astrologer
  //    Profile.findUnique()` invocation in E:\\NewClaude\\...\\astrologer-portal.ts:53:52"}
  //
  // — the ORM, the query, the SQL and the absolute server path, to any caller.
  // Moving it here is half the fix; lib/error-redaction.ts is the other half
  // (driver internals are stripped in ALL environments, not just production).
  // Both halves are locked by src/lib/error-redaction.test.ts.
  //
  // Do not move this below the registers again.
  //
  // I-04 / I18N-03 (2026-08-16). The handler that used to be written inline
  // here now lives in plugins/error-localization.ts, which does the same
  // redaction (lib/error-redaction.ts is unchanged and still decides what a
  // client may see) and then writes the message in the caller's language.
  //
  // The inline version was the reason localization was dead in production. A
  // previous pass authored a 30-code × 5-language catalogue, a resolver and a
  // green suite, but nothing reached a real route: probing api.darshya.online
  // with `Accept-Language: hi` still returned
  //   GET  /api/v1/temples/__no_such__  -> {"error":"Temple not found"}
  //   POST /api/v1/auth/login  body {}  -> {"error":"ValidationError","message":"Required"}
  // Localizing at each call site cannot work — routes `return reply.send(...)`
  // rather than throw, in ~90 files, 719 hand-built error bodies. The plugin's
  // onSend hook is what covers those; both probes are pinned by
  // plugins/error-localization.probes.test.ts against the real route files.
  //
  // Two constraints, both load-bearing:
  //  - It stays ABOVE every `server.register(routes, { prefix })`, for the same
  //    AW-08 reason the inline handler did.
  //  - It is CALLED, not `server.register`-ed: registering would encapsulate
  //    the handler and the hook in a child no sibling route can see.
  const isProdEnv = process.env.NODE_ENV === 'production';
  await errorLocalizationPlugin(server, {
    isProd: isProdEnv,
    onError: captureException,
  });

  // TD-09 / CM-08: serve the self-hosted copy of every catalogue photo the seed
  // and fixtures still name by Wikimedia/Unsplash URL (temples[].images, store
  // product images, gaushala photos). Mapping only, never a DB write; strings
  // not in the generated table pass through untouched.
  // Callback style on purpose: an async preSerialization hook defers the write of
  // every reply by a tick, which is what let a guard's 403 be followed by the
  // handler running (see lib/stop-when-answered.ts). This mapping is synchronous.
  server.addHook('preSerialization', (_request, _reply, payload, done) => {
    try {
      done(null, localizeImages(payload));
    } catch (err) {
      done(err as Error);
    }
  });

  registerNulByteGuard(server);

  // Security plugins
  // API serves only JSON — no HTML, no inline scripts, no embedded frames.
  // Strict default-src 'none' + frame-ancestors 'none' is defense-in-depth
  // against any future templated error page that might leak script context.
  // Web CSP is separate (CF Pages headers).
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  // P0 #200 (2026-08-05): register @fastify/cookie so the API can set + read the
  // httpOnly `darshya_session` cookie. This is the foundation for moving auth
  // tokens out of localStorage (XSS-theft risk) into a JS-inaccessible cookie.
  await server.register(fastifyCookie);
  // CORS: production requires CORS_ORIGIN to be set explicitly. Local dev
  // falls back to the loopback origins only — no LAN IPs, no wildcards. The
  // previous default included a LAN address (192.168.x.x) which leaked into
  // the production allowlist via committed env scaffolding. The list lives in
  // lib/cors-origins.ts so it can be asserted without booting the server; see
  // A11Y-16 for why 127.0.0.1 had to join localhost there.
  const isProd = process.env.NODE_ENV === 'production';
  const corsOrigins = resolveCorsOrigins(process.env);
  await server.register(cors, {
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });
  // R-Q2-E-013 — API rate limiting per-user + per-IP.
  //
  // The per-prefix override hook MUST be registered BEFORE @fastify/rate-limit
  // so its own onRoute hook (which reads `routeOptions.config.rateLimit` at
  // route-registration time, see node_modules/@fastify/rate-limit/index.js
  // line 143) sees the merged config and applies the tightened policy.
  // Previously the override hook was added after the plugin and was a no-op.
  // The matching lives in lib/rate-limit-policy.ts, with tests, because it was
  // WRONG here and nothing could see it. Routes register with a prefix, so this
  // hook receives `/api/v1/auth/login`, while the tests here read
  // `url.startsWith('/auth/')`. No branch ever matched: measured on prod
  // 2026-09-08, `/api/v1/admin/users` answered `x-ratelimit-limit: 100` — the
  // global default — where the admin branch intends 60. `/auth/*` intends 10/min
  // as brute-force protection on password login and was likewise running at 100.
  //
  // Note the comment above: this hook had already been found to be a no-op once
  // and "fixed" by moving its registration before the plugin. That fix was real
  // and is still required; the matching was independently broken, and a
  // registration-order fix could never have surfaced it.
  // A guard that answers 401/403 must also STOP the handler. See
  // lib/stop-when-answered.ts: without this, any async serialization hook lets
  // the handler run behind a 403 (a non-admin could execute admin mutations).
  server.addHook('onRoute', (routeOpts) => {
    wrapRouteGuards(routeOpts as Parameters<typeof wrapRouteGuards>[0]);
  });

  server.addHook('onRoute', (routeOpts) => {
    const existing = (routeOpts.config as { rateLimit?: unknown } | undefined)?.rateLimit;
    if (existing) return;
    const authMax = Number(process.env.RATE_LIMIT_AUTH_MAX) || 10;
    const policy = resolveRateLimitPolicy(routeOpts.url ?? '', authMax);
    if (policy) {
      routeOpts.config = { ...(routeOpts.config ?? {}), rateLimit: policy };
    }
  });

  // Global rate limit. Per-user partition when authenticated; IP fallback for
  // anon traffic. Env-configurable via RATE_LIMIT_MAX / RATE_LIMIT_WINDOW.
  // Liveness probes are exempted via allowList — they must always succeed so
  // load balancers don't mark the node as down under burst traffic.
  const globalMax = Number(process.env.RATE_LIMIT_MAX) || 100;
  const globalWindow = process.env.RATE_LIMIT_WINDOW || '1 minute';
  const SKIP_RATE_LIMIT_PATHS = new Set(['/health', '/ready', '/metrics']);
  await server.register(rateLimit, {
    max: globalMax,
    timeWindow: globalWindow,
    allowList: (req) => SKIP_RATE_LIMIT_PATHS.has(req.url.split('?')[0] ?? ''),
    keyGenerator: (req) => rateLimitKey(req),
    errorResponseBuilder: (_req, ctx) => {
      const retryAfterSeconds = Math.max(1, Math.ceil(ctx.ttl / 1000));
      const message = `Too many requests. Please wait ${retryAfterSeconds} seconds and try again.`;
      return Object.assign(new Error(message), { name: 'RateLimited', statusCode: 429, retryAfterSeconds });
    },
    onExceeded: (req) => {
      // Log the resolved client IP and the bucket that filled. req.ip alone is
      // the Cloudflare/Render proxy on every line, which tells you nothing
      // about who is actually generating the load.
      server.log.warn(
        { ip: clientIp(req), bucket: rateLimitKey(req), url: req.url, method: req.method },
        'rate_limit_exceeded',
      );
    },
  });
  // Per-route raw body access. Opt-in only — routes that need it pass
  // `{ config: { rawBody: true } }` (e.g. payment webhooks where the
  // signature must be verified against the bytes Razorpay actually
  // sent, not what JSON.stringify reproduces). global:false avoids
  // double-buffering every request.
  await server.register(fastifyRawBody, {
    field: 'rawBody',
    global: false,
    encoding: 'utf8',
    runFirst: true,
  });

  // Register auth decorators (must be before routes)
  await registerAuthDecorators(server);

  // Health + readiness probes (excluded from rate-limit allowList above).
  //
  // OPS-04 — /health used to be a static `{status:'ok'}` literal: a 200 for as
  // long as the Node process had a heartbeat, with the database unreachable.
  // `render.yaml` sets `healthCheckPath: /health` and every uptime monitor
  // points at the same URL, so the one probe that decides whether this service
  // is alive could never go red. It now performs a real `SELECT 1` — cached per
  // 5s window, bounded by a 2s timeout, and only `degraded` (503) after three
  // consecutive failures so a two-second blip cannot trigger a Render restart
  // loop (the start command re-runs `prisma migrate deploy`). See routes/health.ts.
  //
  // NOTE on the "second /health": cron.ts:92 also declares `server.get('/health')`,
  // but that route is registered under the `/api/v1/cron` prefix (see
  // server.register(cronRoutes, { prefix: '/api/v1/cron' }) below), so it
  // resolves to /api/v1/cron/health — NOT a root-level duplicate of this /health.
  // Only ONE root /health exists. No removal needed.
  await server.register(healthRoutes);

  // NOTIF-01: the scheduler was dead for the entire life of the product and
  // nothing surfaced that. Age of the last completed tick is the signal — a
  // silent scheduler is indistinguishable from a working one without it.
  // Unauthenticated by design: it exposes only timings and counters, no data,
  // and an external pinger must be able to read it. Rate-limited normally.
  // NOTIF-03: readiness of the four outbound transports (email/WhatsApp/web
  // push/FCM). Registered as a SIBLING of /health rather than folded into it —
  // /health is the liveness probe Render polls and must never false-negative on
  // a missing WhatsApp key. See routes/health-channels.ts.
  await server.register(healthChannelRoutes, { prefix: '/health' });
  await server.register(healthChannelRoutes, { prefix: '/api/v1/health' });

  server.get('/ops/scheduler', async (_request, reply) => {
    const status = getSchedulerStatus();
    // 503 when stale so an uptime monitor can alarm on it without parsing JSON.
    return reply.code(status.stale ? 503 : 200).send(status);
  });

  // /ready = READINESS — actually verifies dependencies. Returns 503 if the DB
  // is unreachable or (when REDIS_URL is set) Redis won't ping. Used by
  // orchestrators that route traffic only to healthy nodes. Kept OUT of the
  // liveness path so a transient DB blip doesn't restart the pod.
  server.get('/ready', async (_request, reply) => {
    const checks: { db: 'ok' | 'fail'; redis: 'ok' | 'fail' | 'skipped'; queue: 'ok' | 'degraded' } = {
      db: 'ok',
      redis: 'skipped',
      queue: isJobQueueAvailable() ? 'ok' : 'degraded',
    };
    let ok = true;

    // DB probe — SELECT 1 is the cheapest round-trip that proves the pool works.
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      ok = false;
      checks.db = 'fail';
      server.log.error({ err }, 'readiness DB probe failed');
    }

    // Redis probe — only when REDIS_URL is configured. Pings the same Upstash
    // instance BullMQ uses so /ready reflects the real worker dependency.
    if (isJobQueueConfigured) {
      try {
        const { default: Ioredis } = await import('ioredis');
        const url = process.env.REDIS_URL!;
        // Parse host/port/password the same way job-queue.service does.
        const u = new URL(url);
        const conn = new Ioredis({
          host: u.hostname,
          port: u.port ? Number(u.port) : 6379,
          password: u.password ? decodeURIComponent(u.password) : undefined,
          username: u.username && u.username !== 'default' ? u.username : undefined,
          tls: u.protocol === 'rediss:' ? {} : undefined,
          maxRetriesPerRequest: 1,
          enableReadyCheck: false,
          lazyConnect: false,
        });
        await conn.ping();
        checks.redis = 'ok';
        conn.disconnect();
      } catch (err) {
        ok = false;
        checks.redis = 'fail';
        server.log.error({ err }, 'readiness Redis probe failed');
      }
    }

    const body = { ready: ok, timestamp: new Date().toISOString(), checks };
    if (!ok) return reply.code(503).send(body);
    return reply.send(body);
  });

  // ── Per-route latency instrumentation ─────────────────────────────
  // Lightweight in-memory p50/p95/p99 tracker. Reporter logs top-20 by p95
  // every 5 min. Live snapshot at /api/v1/admin/metrics/latency (admin gate).
  // Zero infra burn — no Prometheus, no DB writes.
  server.addHook('onRequest', async (request) => {
    (request as unknown as { _lat?: bigint })._lat = process.hrtime.bigint();
  });
  server.addHook('onResponse', async (request, reply) => {
    const start = (request as unknown as { _lat?: bigint })._lat;
    if (start === undefined) return;
    const ms = Number(process.hrtime.bigint() - start) / 1_000_000;
    const route = request.routeOptions?.url ?? request.url.split('?')[0] ?? 'unknown';
    recordLatency(`${request.method} ${route} → ${reply.statusCode}`, ms);
  });
  startMetricsReporter(server.log);

  // ── R-Q2-E-011: DB query instrumentation ──────────────────────────
  // Slow-query log: warn when any Prisma query > SLOW_QUERY_MS (default 100).
  // N+1 detector: per-request ALS scope counts identical SQL templates; warns
  // when any template fires > N_PLUS_ONE_THRESHOLD (default 5) inside a single
  // request. Both noop when DB_QUERY_INSTRUMENTATION=off.
  instrumentPrisma(prisma, server.log);
  registerNPlusOneRequestScope(server, server.log);

  server.get(
    '/api/v1/admin/metrics/latency',
    { preHandler: [authenticateUser, requireRole('admin')] },
    async () => ({ stats: snapshotStats() }),
  );

  // API v1 routes
  await server.register(authRoutes, { prefix: '/api/v1/auth' });
  await server.register(userRoutes, { prefix: '/api/v1/users' });
  await server.register(accountRoutes, { prefix: '/api/v1/account' });
  await server.register(readingProgressRoutes, { prefix: '/api/v1/me/reading-progress' });
  await server.register(digestRoutes, { prefix: '/api/v1/digest' });
  await server.register(recurringRoutes, { prefix: '/api/v1/recurring' });
  await server.register(templeRoutes, { prefix: '/api/v1/temples' });
  await server.register(pujaRoutes, { prefix: '/api/v1/pujas' });
  await server.register(bookingRoutes, { prefix: '/api/v1/bookings' });
  await server.register(paymentRoutes, { prefix: '/api/v1/payments' });
  await server.register(contentRoutes, { prefix: '/api/v1/content' });
  await server.register(darshanRoutes, { prefix: '/api/v1/darshan' });
  await server.register(panchangRoutes, { prefix: '/api/v1/panchang' });
  await server.register(storeRoutes, { prefix: '/api/v1/store' });
  await server.register(storeAdminRoutes, { prefix: '/api/v1/store-admin' });
  await server.register(subscriptionRoutes, { prefix: '/api/v1/subscriptions' });
  await server.register(priestRoutes, { prefix: '/api/v1/priest' });
  await server.register(priestsPublicRoutes, { prefix: '/api/v1/priests' });
  await server.register(adminRoutes, { prefix: '/api/v1/admin' });
  await server.register(aiRoutes, { prefix: '/api/v1/ai' });
  await server.register(gaushalaRoutes, { prefix: '/api/v1/gaushala' });
  await server.register(astrologyRoutes, { prefix: '/api/v1/astrology' });
  await server.register(weddingRoutes, { prefix: '/api/v1/weddings' });
  await server.register(wellnessRoutes, { prefix: '/api/v1/wellness' });
  await server.register(onboardingRoutes, { prefix: '/api/v1/onboarding' });
  await server.register(providerRoutes, { prefix: '/api/v1/providers' });
  await server.register(providerKycRoutes, { prefix: '/api/v1/provider-kyc' });
  await server.register(yatraRoutes, { prefix: '/api/v1/yatra' });
  await server.register(yatraPackagesRoutes, { prefix: '/api/v1/yatra-packages' });
  await server.register(affiliateRoutes, { prefix: '/api/v1/affiliate' });
  await server.register(templePortalRoutes, { prefix: '/api/v1/temple-portal' });
  await server.register(astrologerPortalRoutes, { prefix: '/api/v1/astrologer-portal' });
  await server.register(wellnessPortalRoutes, { prefix: '/api/v1/wellness-portal' });
  await server.register(gaushalaPortalRoutes, { prefix: '/api/v1/gaushala-portal' });
  await server.register(gaushalaCowsRoutes, { prefix: '/api/v1/gaushala-portal' });
  await server.register(gaushalaVolunteersRoutes, { prefix: '/api/v1/gaushala-portal' });
  await server.register(supportRoutes, { prefix: '/api/v1/support' });
  await server.register(searchRoutes, { prefix: '/api/v1/search' });
  await server.register(consultationRoutes, { prefix: '/api/v1/consultation' });
  await server.register(payoutsRoutes, { prefix: '/api/v1/payouts' });
  await server.register(magicLinkRoutes, { prefix: '/api/v1/auth/magic-link' });
  await server.register(whatsappOtpRoutes, { prefix: '/api/v1/auth/whatsapp-otp' });
  await server.register(donationRoutes, { prefix: '/api/v1/donations' });
  await server.register(mediaRoutes, { prefix: '/api/v1/media' });
  await server.register(notificationRoutes, { prefix: '/api/v1/notifications' });
  await server.register(semanticSearchRoutes, { prefix: '/api/v1/semantic-search' });
  await server.register(cronRoutes, { prefix: '/api/v1/cron' });
  await server.register(adminCronRoutes, { prefix: '/api/v1/admin/cron' });
  await server.register(adminOpsRoutes, { prefix: '/api/v1/admin/ops' });
  await server.register(adminMetricsRoutes, { prefix: '/api/v1/admin/metrics' });
  await server.register(conversationRoutes, { prefix: '/api/v1/conversations' });
  await server.register(demoPayRoutes, { prefix: '/api/v1/demo-pay' });
  await server.register(ratingRoutes, { prefix: '/api/v1/ratings' });
  await server.register(storeOrderRoutes, { prefix: '/api/v1/store' });
  await server.register(wellnessSessionRoutes, { prefix: '/api/v1/wellness' });
  await server.register(outreachWebhookRoutes, { prefix: '/api/v1/outreach' });
  await server.register(outreachTrackingRoutes, { prefix: '/api/v1/outreach' });
  await server.register(outreachAdminRoutes, { prefix: '/api/v1/admin/outreach' });
  await server.register(adminLeadsRoutes, { prefix: '/api/v1/admin' });
  await server.register(adminTemplesRoutes, { prefix: '/api/v1/admin/temple-timings' });
  await server.register(adminBookingsRoutes, { prefix: '/api/v1/admin/bookings' });
  await server.register(adminGaushalaDisbursementRoutes, { prefix: '/api/v1/admin/gaushala-disbursements' });
  await server.register(adminTempleSettlementRoutes, { prefix: '/api/v1/admin/temple-settlements' });
  await server.register(adminTempleLinkRoutes, { prefix: '/api/v1/admin/temple-links' });
  await server.register(adminLeadConversionRoutes, { prefix: '/api/v1/admin/leads' });
  await server.register(waitlistRoutes, { prefix: '/api/v1/waitlist' });
  await server.register(leadsSelfOnboardRoutes, { prefix: '/api/v1/leads' });
  await server.register(whatsappBroadcastRoutes, { prefix: '/api/v1/admin/whatsapp' });
  await server.register(whatsappWebhookRoutes, { prefix: '/api/v1/whatsapp' });
  await server.register(adminContentQueueRoutes, { prefix: '/api/v1/admin/content-queue' });
  await server.register(adminQueueRoutes, { prefix: '/api/v1/admin/queue' });
  await server.register(adminDonationsExportRoutes, { prefix: '/api/v1/admin/donations' });
  await server.register(adminRoadmapRoutes, { prefix: '/api/v1' });
  await server.register(adminRoadmapOrchestratorRoutes, { prefix: '/api/v1' });
  await server.register(adminSubscriptionsRoutes, { prefix: '/api/v1' });
  await server.register(orgsRoutes, { prefix: '/api/v1/orgs' });
  await server.register(marketplaceV2Routes, { prefix: '/api/v2/marketplace' });
  await server.register(marketplaceAdminRoutes, { prefix: '/api/v1/admin/marketplace' });
  await server.register(csrMatchRoutes, { prefix: '/api/v1/csr-match' });
  await server.register(antimSanskarRoutes, { prefix: '/api/v1/antim-sanskar' });
  await server.register(lessonsRoutes, { prefix: '/api/v1/lessons' });
  await server.register(gurukulsRoutes, { prefix: '/api/v1/gurukuls' });
  await server.register(gurukulApplicationsRoutes, { prefix: '/api/v1/gurukul-applications' });
  await server.register(gurukulPortalRoutes, { prefix: '/api/v1/gurukul-portal' });
  await server.register(adminGurukulsRoutes, { prefix: '/api/v1/admin/gurukuls' });
  await server.register(knowledgeRoutes, { prefix: '/api/v1/knowledge' });
  await server.register(adminAgentsRoutes, { prefix: '/api/v1/admin/agents' });
  await server.register(publicAgentFeedRoutes, { prefix: '/api/v1/public/agents' });
  await server.register(referralsRoutes, { prefix: '/api/v1/referrals' });
  await server.register(b2bRoutes, { prefix: '/api/v1/b2b' });
  await server.register(giftPujaRoutes, { prefix: '/api/v1/gift-puja' });
  await server.register(yatraInquiryRoutes, { prefix: '/api/v1/yatra-inquiry' });
  await server.register(dpdpRoutes, { prefix: '/api/v1/dpdp' });
  // R-Q3-E-001 — Voice AI Pandit v1 (Whisper STT + Groq LLM + ElevenLabs TTS)
  await server.register(voicePanditRoutes, { prefix: '/api/v1/voice-pandit' });

  // Start server
  const port = Number(process.env.PORT || process.env.API_PORT) || 4000;
  const host = process.env.HOST || '0.0.0.0';

  // (The error handler + Sentry forwarding now live at the TOP of bootstrap().
  //  AW-08: installed here, after every server.register(), Fastify never routed
  //  a single error through it. It must stay above the registers.)

  try {
    await server.listen({ port, host });
    server.log.info(`Darshya API running at http://${host}:${port}`);
    // NOTIF-01: nothing anywhere invoked runDailyOps, so every time-based
    // feature — panchang push, aarti reminders, weekly digest, expired-offer
    // rebroadcast, auto-refunds, weekly settlement — was dead code in
    // production. Start it here, after listen, so a scheduler fault can never
    // stop the API from serving. See jobs/scheduler.ts for why this is
    // in-process rather than a GitHub Actions schedule.
    startOpsScheduler(server.log);
    // NOTIF-03, third clause: say out loud, once per boot, which outbound
    // channels are dark. An operator should not have to curl an endpoint to
    // discover that email and web push are both off. A WARN line (plus a Sentry
    // alert in prod when email AND web push are both unconfigured) rather than
    // a boot failure: the channels actually dark in production are whatsapp and
    // fcm, and refusing to boot over those would take bookings, payments and
    // darshan offline for two channels the core flow does not depend on.
    // (An earlier draft of this comment claimed all four were dark. Measured
    // against live prod 2026-09-03: email and webPush are configured — email
    // was configured and failing 48/48, which is why the status surface now
    // reports a failure RATE rather than only a quota refusal.)
    // Logs channel and env var NAMES only — never a value.
    reportChannelReadinessAtBoot(server.log);
  } catch (err) {
    server.log.error(err);
    captureException(err);
    process.exit(1);
  }
}

bootstrap();

export default server;
