import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { uuidParamGuard } from '../lib/uuid.js';
import { authenticateUser, requireRole } from '../middlewares/auth.js';

/**
 * Layer AW — Marketplace API for 3rd-party temple/devotional apps.
 *
 * Public read API at /api/v2/marketplace, gated by API keys (header
 * `X-Darshya-API-Key: msk_<random>`). Each key has rate-limit + scope.
 *
 * Tables (raw SQL, no Prisma migration):
 *   marketplace_api_keys: id, name, key_hash, owner_email, scopes,
 *     rate_limit_per_min, requests_today, last_used_at, is_active, created_at
 *
 * Endpoints (all read-only):
 *   GET /api/v2/marketplace/temples                — list temples
 *   GET /api/v2/marketplace/temples/:slug          — temple detail
 *   GET /api/v2/marketplace/pujas                  — list puja types
 *   GET /api/v2/marketplace/pujas/:slug            — puja type detail
 *   GET /api/v2/marketplace/darshan/live           — live streams
 *   GET /api/v2/marketplace/yatra-destinations     — yatra destination list
 *
 * Admin endpoints (admin auth):
 *   POST /api/v1/admin/marketplace/keys            — issue new key
 *   GET  /api/v1/admin/marketplace/keys            — list keys
 *   DELETE /api/v1/admin/marketplace/keys/:id      — revoke
 */

const PUBLIC_HEADER = 'x-darshya-api-key';

async function ensureTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS marketplace_api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      key_hash TEXT UNIQUE NOT NULL,
      key_prefix TEXT NOT NULL,
      owner_email TEXT NOT NULL,
      scopes TEXT[] DEFAULT ARRAY['read:temples', 'read:pujas', 'read:darshan']::TEXT[],
      rate_limit_per_min INT DEFAULT 60,
      requests_today INT DEFAULT 0,
      last_used_at TIMESTAMPTZ,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(),
      revoked_at TIMESTAMPTZ
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS marketplace_api_keys_hash_idx ON marketplace_api_keys (key_hash) WHERE is_active = true;
  `);
}

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function generateKey(): { key: string; hash: string; prefix: string } {
  const random = crypto.randomBytes(24).toString('base64url');
  const key = `msk_${random}`;
  return { key, hash: hashKey(key), prefix: key.slice(0, 12) };
}

// In-memory rate limit per key (best effort). For prod scale, move to Redis.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(keyHash: string, perMin: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(keyHash);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(keyHash, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= perMin) return false;
  entry.count++;
  return true;
}

async function authenticateKey(
  headerVal: string | undefined,
): Promise<{ id: string; scopes: string[]; rate_limit_per_min: number } | null> {
  if (!headerVal || !headerVal.startsWith('msk_')) return null;
  const hash = hashKey(headerVal);
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; scopes: string[]; rate_limit_per_min: number }>>(
    `SELECT id, scopes, rate_limit_per_min FROM marketplace_api_keys
     WHERE key_hash = $1 AND is_active = true LIMIT 1`,
    hash,
  );
  if (rows.length === 0) return null;
  // Bump last_used_at + requests_today (best-effort, no blocking)
  await prisma
    .$executeRawUnsafe(
      `UPDATE marketplace_api_keys SET last_used_at = now(), requests_today = requests_today + 1 WHERE id = $1::uuid`,
      rows[0]!.id,
    )
    .catch(() => undefined);
  return rows[0]!;
}

export async function marketplaceV2Routes(server: FastifyInstance) {
  await ensureTables().catch((err) => server.log.warn({ err }, 'marketplace_api_keys table init failed'));

  const requireApiKey = async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
    const headerVal = request.headers[PUBLIC_HEADER] as string | undefined;
    const key = await authenticateKey(headerVal);
    if (!key) {
      return reply.code(401).send({ error: 'Invalid or missing X-Darshya-API-Key' });
    }
    if (!checkRateLimit(headerVal!, key.rate_limit_per_min)) {
      return reply.code(429).send({ error: 'Rate limit exceeded', limitPerMin: key.rate_limit_per_min });
    }
    (request as unknown as { apiKey: typeof key }).apiKey = key;
  };

  server.get('/temples', { preHandler: [requireApiKey] }, async () => {
    const temples = await prisma.temple.findMany({
      select: { id: true, slug: true, name: true, city: true, state: true, deityPrimary: true, tradition: true, isVerified: true, liveDarshanEnabled: true },
      take: 100,
      orderBy: { trustScore: 'desc' },
    });
    return { temples, total: temples.length };
  });

  server.get<{ Params: { slug: string } }>('/temples/:slug', { preHandler: [requireApiKey] }, async (request, reply) => {
    const temple = await prisma.temple.findUnique({
      where: { slug: request.params.slug },
      select: {
        id: true, slug: true, name: true, nameLocal: true, description: true,
        city: true, state: true, country: true, lat: true, lng: true,
        deityPrimary: true, tradition: true, images: true, timingInfo: true,
        isVerified: true, liveDarshanEnabled: true,
      },
    });
    if (!temple) return reply.code(404).send({ error: 'Temple not found' });
    return temple;
  });

  server.get('/pujas', { preHandler: [requireApiKey] }, async () => {
    const pujas = await prisma.pujaType.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, name: true, deity: true, category: true, basePrice: true, nriPrice: true, durationMinutes: true },
      take: 100,
    });
    return { pujas, total: pujas.length };
  });

  server.get<{ Params: { slug: string } }>('/pujas/:slug', { preHandler: [requireApiKey] }, async (request, reply) => {
    const puja = await prisma.pujaType.findUnique({
      where: { slug: request.params.slug },
      select: { id: true, slug: true, name: true, nameLocal: true, description: true, deity: true, category: true, basePrice: true, nriPrice: true, durationMinutes: true, samagriIncluded: true, images: true },
    });
    if (!puja) return reply.code(404).send({ error: 'Puja not found' });
    return puja;
  });

  server.get('/darshan/live', { preHandler: [requireApiKey] }, async () => {
    const temples = await prisma.temple.findMany({
      where: { liveDarshanEnabled: true },
      select: { slug: true, name: true, city: true, deityPrimary: true, streamUrl: true, timingInfo: true },
      take: 50,
    });
    return { streams: temples };
  });

  server.get('/yatra-destinations', { preHandler: [requireApiKey] }, async () => {
    // Lightweight surface — slugs only; consumer fetches details from public site
    const destinations = [
      'vaishno-devi', 'tirupati-balaji', 'char-dham', 'shirdi-sai', 'kashi',
      'amarnath', 'kailash-mansarovar', 'rameshwaram-madurai', 'dwarka-somnath', 'ujjain-mahakaleshwar',
    ];
    return { destinations };
  });
}

// ─── Admin key management routes (separate prefix /api/v1/admin/marketplace) ──

const issueKeySchema = z.object({
  name: z.string().min(2).max(100),
  ownerEmail: z.string().email(),
  scopes: z.array(z.string()).optional(),
  rateLimitPerMin: z.number().int().min(10).max(600).optional(),
});

export async function marketplaceAdminRoutes(server: FastifyInstance) {
  await ensureTables().catch(() => undefined);

  // P0 security gate — admin-only. Comment above was aspirational; parent
  // router did NOT wrap. Apply preHandler explicitly on every route.
  const adminPreHandlers = [authenticateUser, requireRole('admin')];

  server.post('/keys', { preHandler: adminPreHandlers }, async (request, reply) => {
    const parsed = issueKeySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
    }
    const { key, hash, prefix } = generateKey();
    await prisma.$executeRawUnsafe(
      `INSERT INTO marketplace_api_keys (name, key_hash, key_prefix, owner_email, scopes, rate_limit_per_min)
       VALUES ($1, $2, $3, $4, $5::TEXT[], $6)`,
      parsed.data.name,
      hash,
      prefix,
      parsed.data.ownerEmail,
      parsed.data.scopes ?? ['read:temples', 'read:pujas', 'read:darshan'],
      parsed.data.rateLimitPerMin ?? 60,
    );
    server.log.info({ name: parsed.data.name, ownerEmail: parsed.data.ownerEmail, prefix }, 'marketplace key issued');
    // Key only returned ONCE — at creation time
    return { key, prefix, message: 'Save this key — it cannot be retrieved again.' };
  });

  server.get('/keys', { preHandler: adminPreHandlers }, async () => {
    const rows = await prisma.$queryRawUnsafe<unknown[]>(
      `SELECT id, name, key_prefix, owner_email, scopes, rate_limit_per_min,
              requests_today, last_used_at, is_active, created_at, revoked_at
         FROM marketplace_api_keys ORDER BY created_at DESC`,
    );
    return { keys: rows };
  });

  server.delete<{ Params: { id: string } }>('/keys/:id', { preHandler: [...adminPreHandlers, uuidParamGuard('id')] }, async (request) => {
    await prisma.$executeRawUnsafe(
      `UPDATE marketplace_api_keys SET is_active = false, revoked_at = now() WHERE id = $1::uuid`,
      request.params.id,
    );
    return { revoked: true };
  });
}
