import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
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
  await server.register(cors, {
    origin: [
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      process.env.ADMIN_URL || 'http://localhost:3001',
    ],
    credentials: true,
  });
  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
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

  // Start server
  const port = Number(process.env.API_PORT) || 4000;
  const host = process.env.HOST || '0.0.0.0';

  try {
    await server.listen({ port, host });
    server.log.info(`Bhaktisetu API running at http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

bootstrap();

export default server;
