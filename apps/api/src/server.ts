import { initSentry, captureException } from './lib/sentry.js';
// Initialise Sentry as the very first thing — must come before any
// imports that might throw, so errors during module load are captured.
initSentry();

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyRawBody from 'fastify-raw-body';
import { registerAuthDecorators } from './middlewares/auth.js';
import { templeRoutes } from './routes/temples.js';
import { pujaRoutes } from './routes/pujas.js';
import { bookingRoutes } from './routes/bookings.js';
import { paymentRoutes } from './routes/payments.js';
import { contentRoutes } from './routes/content.js';
import { darshanRoutes } from './routes/darshan.js';
import { userRoutes } from './routes/users.js';
import { authRoutes } from './routes/auth.js';
import { subscriptionRoutes } from './routes/subscriptions.js';
import { priestRoutes } from './routes/priest.js';
import { adminRoutes } from './routes/admin.js';
import { panchangRoutes } from './routes/panchang.js';
import { storeRoutes } from './routes/store.js';
import { aiRoutes } from './routes/ai.js';
import { gaushalaRoutes } from './routes/gaushala.js';
import { astrologyRoutes } from './routes/astrology.js';
import { wellnessRoutes } from './routes/wellness.js';
import { onboardingRoutes } from './routes/onboarding.js';
import { providerRoutes } from './routes/providers.js';
import { providerKycRoutes } from './routes/provider-kyc.js';
import { yatraRoutes } from './routes/yatra.js';
import { supportRoutes } from './routes/support.js';
import { searchRoutes } from './routes/search.js';
import { consultationRoutes } from './routes/consultation.js';
import { magicLinkRoutes } from './routes/magic-link.js';
import { donationRoutes } from './routes/donations.js';
import { mediaRoutes } from './routes/media.js';
import { whatsappOtpRoutes } from './routes/whatsapp-otp.js';
import { notificationRoutes } from './routes/notifications.js';
import { semanticSearchRoutes } from './routes/semantic-search.js';
import { cronRoutes } from './routes/cron.js';
import { conversationRoutes } from './routes/conversations.js';
import { demoPayRoutes } from './routes/demo-pay.js';
import { ratingRoutes } from './routes/ratings.js';

const server = Fastify({
  logger: {
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
});

async function bootstrap() {
  // Security plugins
  await server.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
    : [
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        process.env.ADMIN_URL || 'http://localhost:3001',
      ];
  await server.register(cors, {
    origin: corsOrigins,
    credentials: true,
  });
  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
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

  // Health check
  server.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // API v1 routes
  await server.register(authRoutes, { prefix: '/api/v1/auth' });
  await server.register(userRoutes, { prefix: '/api/v1/users' });
  await server.register(templeRoutes, { prefix: '/api/v1/temples' });
  await server.register(pujaRoutes, { prefix: '/api/v1/pujas' });
  await server.register(bookingRoutes, { prefix: '/api/v1/bookings' });
  await server.register(paymentRoutes, { prefix: '/api/v1/payments' });
  await server.register(contentRoutes, { prefix: '/api/v1/content' });
  await server.register(darshanRoutes, { prefix: '/api/v1/darshan' });
  await server.register(panchangRoutes, { prefix: '/api/v1/panchang' });
  await server.register(storeRoutes, { prefix: '/api/v1/store' });
  await server.register(subscriptionRoutes, { prefix: '/api/v1/subscriptions' });
  await server.register(priestRoutes, { prefix: '/api/v1/priest' });
  await server.register(adminRoutes, { prefix: '/api/v1/admin' });
  await server.register(aiRoutes, { prefix: '/api/v1/ai' });
  await server.register(gaushalaRoutes, { prefix: '/api/v1/gaushala' });
  await server.register(astrologyRoutes, { prefix: '/api/v1/astrology' });
  await server.register(wellnessRoutes, { prefix: '/api/v1/wellness' });
  await server.register(onboardingRoutes, { prefix: '/api/v1/onboarding' });
  await server.register(providerRoutes, { prefix: '/api/v1/providers' });
  await server.register(providerKycRoutes, { prefix: '/api/v1/provider-kyc' });
  await server.register(yatraRoutes, { prefix: '/api/v1/yatra' });
  await server.register(supportRoutes, { prefix: '/api/v1/support' });
  await server.register(searchRoutes, { prefix: '/api/v1/search' });
  await server.register(consultationRoutes, { prefix: '/api/v1/consultation' });
  await server.register(magicLinkRoutes, { prefix: '/api/v1/auth/magic-link' });
  await server.register(whatsappOtpRoutes, { prefix: '/api/v1/auth/whatsapp-otp' });
  await server.register(donationRoutes, { prefix: '/api/v1/donations' });
  await server.register(mediaRoutes, { prefix: '/api/v1/media' });
  await server.register(notificationRoutes, { prefix: '/api/v1/notifications' });
  await server.register(semanticSearchRoutes, { prefix: '/api/v1/semantic-search' });
  await server.register(cronRoutes, { prefix: '/api/v1/cron' });
  await server.register(conversationRoutes, { prefix: '/api/v1/conversations' });
  await server.register(demoPayRoutes, { prefix: '/api/v1/demo-pay' });
  await server.register(ratingRoutes, { prefix: '/api/v1/ratings' });

  // Start server
  const port = Number(process.env.PORT || process.env.API_PORT) || 4000;
  const host = process.env.HOST || '0.0.0.0';

  // Forward uncaught Fastify errors to Sentry (no-op when SENTRY_DSN unset)
  server.setErrorHandler((err, _req, reply) => {
    server.log.error(err);
    captureException(err);
    if (!reply.sent) {
      const e = err as { statusCode?: number; name?: string; message?: string };
      reply.code(e.statusCode ?? 500).send({
        error: e.name ?? 'InternalServerError',
        message: e.message ?? 'Something went wrong',
      });
    }
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
