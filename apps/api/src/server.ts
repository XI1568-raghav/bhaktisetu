import { initSentry, captureException } from './lib/sentry.js';
// Initialise Sentry as the very first thing — must come before any
// imports that might throw, so errors during module load are captured.
initSentry();

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyRawBody from 'fastify-raw-body';
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
import { readingProgressRoutes } from './routes/reading-progress.js';
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
import { adminTemplesRoutes } from './routes/admin-temples.js';
import { adminBookingsRoutes } from './routes/admin-bookings.js';
import { adminLeadConversionRoutes } from './routes/admin-lead-conversion.js';
import { waitlistRoutes } from './routes/waitlist.js';
import { leadsSelfOnboardRoutes } from './routes/leads-self-onboard.js';
import {
  whatsappBroadcastRoutes,
  whatsappWebhookRoutes,
} from './routes/whatsapp-broadcast.js';
import { adminContentQueueRoutes } from './routes/admin-content-queue.js';
import { adminDonationsExportRoutes } from './routes/admin-donations-export.js';
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
import { giftPujaRoutes } from './routes/gift-puja.js';
import { yatraInquiryRoutes } from './routes/yatra-inquiry.js';
import { recordLatency, snapshotStats, startMetricsReporter } from './lib/route-metrics.js';

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
  // CORS: production requires CORS_ORIGIN to be set explicitly. Local dev
  // falls back to localhost-only — no LAN IPs, no wildcards. The previous
  // default included a LAN address (192.168.x.x) which leaked into the
  // production allowlist via committed env scaffolding.
  const isProd = process.env.NODE_ENV === 'production';
  const corsOriginEnv = process.env.CORS_ORIGIN;
  const corsOrigins = corsOriginEnv
    ? corsOriginEnv.split(',').map((o) => o.trim()).filter(Boolean)
    : isProd
      ? (() => {
          // Explicit fail in prod — refuse to start with a wide-open default.
          throw new Error('CORS_ORIGIN env var is required in production. Set it to the comma-separated list of allowed origins.');
        })()
      : ['http://localhost:3000', 'http://localhost:3001'];
  await server.register(cors, {
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });
  // Global rate limit. Per-prefix overrides applied via onRoute hook below.
  // Per-user partition when authenticated; IP fallback for anon traffic.
  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req) => {
      const uid = (req as unknown as { currentUser?: { id?: string } }).currentUser?.id;
      return uid ? `u:${uid}` : `ip:${req.ip}`;
    },
    onExceeded: (req) => {
      server.log.warn(
        { ip: req.ip, url: req.url, method: req.method },
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

  // Per-prefix rate-limit policy (TD6). Routes can override via
  // `{ config: { rateLimit: ... } }` — this hook only fills defaults.
  // Limits documented in docs/rate-limits.md.
  server.addHook('onRoute', (routeOpts) => {
    const url = routeOpts.url ?? '';
    const existing = (routeOpts.config as { rateLimit?: unknown } | undefined)?.rateLimit;
    if (existing) return;
    let policy: { max: number; timeWindow: string } | null = null;
    if (url.startsWith('/auth/') || url.startsWith('/auth')) policy = { max: 10, timeWindow: '1 minute' };
    // P0 — cap ALL /ai/* (was only /ai/chat). Groq/Anthropic spend exposure.
    // Covers /ai/chat, /ai/summarize, /ai/recommend, and any future /ai/* added.
    else if (url.startsWith('/ai/')) policy = { max: 20, timeWindow: '1 minute' };
    // Astrology AI endpoint shares the LLM bill — cap separately.
    else if (url.startsWith('/astrology/ask') || url === '/astrology/ask') policy = { max: 20, timeWindow: '1 minute' };
    else if (url.startsWith('/bookings/create-order') || url.startsWith('/bookings/verify-payment')) policy = { max: 30, timeWindow: '1 minute' };
    else if (url.startsWith('/donations/create-order')) policy = { max: 10, timeWindow: '1 minute' };
    else if (url.startsWith('/admin/')) policy = { max: 60, timeWindow: '1 minute' };
    else if (url.startsWith('/affiliate/')) policy = { max: 60, timeWindow: '1 minute' };
    if (policy) {
      routeOpts.config = { ...(routeOpts.config ?? {}), rateLimit: policy };
    }
  });

  // Health check
  server.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

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

  server.get(
    '/api/v1/admin/metrics/latency',
    { preHandler: [authenticateUser, requireRole('admin')] },
    async () => ({ stats: snapshotStats() }),
  );

  // API v1 routes
  await server.register(authRoutes, { prefix: '/api/v1/auth' });
  await server.register(userRoutes, { prefix: '/api/v1/users' });
  await server.register(readingProgressRoutes, { prefix: '/api/v1/me/reading-progress' });
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
  await server.register(adminLeadConversionRoutes, { prefix: '/api/v1/admin/leads' });
  await server.register(waitlistRoutes, { prefix: '/api/v1/waitlist' });
  await server.register(leadsSelfOnboardRoutes, { prefix: '/api/v1/leads' });
  await server.register(whatsappBroadcastRoutes, { prefix: '/api/v1/admin/whatsapp' });
  await server.register(whatsappWebhookRoutes, { prefix: '/api/v1/whatsapp' });
  await server.register(adminContentQueueRoutes, { prefix: '/api/v1/admin/content-queue' });
  await server.register(adminDonationsExportRoutes, { prefix: '/api/v1/admin/donations' });
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
  await server.register(giftPujaRoutes, { prefix: '/api/v1/gift-puja' });
  await server.register(yatraInquiryRoutes, { prefix: '/api/v1/yatra-inquiry' });

  // Start server
  const port = Number(process.env.PORT || process.env.API_PORT) || 4000;
  const host = process.env.HOST || '0.0.0.0';

  // Forward uncaught Fastify errors to Sentry (no-op when SENTRY_DSN unset).
  // In production, never echo `err.message` back to the client — Prisma
  // errors carry table/column/constraint names and query fragments that
  // leak schema details. Surface a generic message; the full error is in
  // the server logs and Sentry. Validation errors (4xx) and rate-limit
  // errors are exempt — those messages are intentionally user-facing.
  server.setErrorHandler((err, _req, reply) => {
    server.log.error(err);
    captureException(err);
    if (reply.sent) return;

    const e = err as { statusCode?: number; name?: string; message?: string; code?: string };
    const status = e.statusCode ?? 500;
    const isClientError = status >= 400 && status < 500;
    const safeToEcho = !isProd || isClientError || e.code === 'FST_ERR_VALIDATION';

    reply.code(status).send({
      error: e.name ?? 'InternalServerError',
      message: safeToEcho
        ? (e.message ?? 'Something went wrong')
        : 'Internal server error',
    });
  });

  try {
    await server.listen({ port, host });
    server.log.info(`Darshya API running at http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    captureException(err);
    process.exit(1);
  }
}

bootstrap();

export default server;
