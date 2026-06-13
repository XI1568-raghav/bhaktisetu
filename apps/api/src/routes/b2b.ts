/**
 * R-Q3-E-007: B2B Temple SaaS API v1 — MVP slice
 *
 * 5 read-only endpoints + API-key auth + per-key rate-limit + scope-gated PII masking.
 * Founder-action-required: bootstrap first 5 partners via `pnpm tsx scripts/issue-b2b-key.ts`.
 *
 * Storage: in-memory dev map when DB unavailable; Prisma `B2BApiKey` model when migrated.
 * Schema added separately (see docs/cto/R-Q3-E-007-handoff.md Phase 1 DDL).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'node:crypto';
import { z } from 'zod';

// ---------- Schemas ----------

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().max(128).optional(),
  since: z.string().datetime().optional(),
});

const sinceQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  since: z.string().datetime().optional(),
});

export type B2BApiKeyRecord = {
  id: string;
  orgName: string;
  contactEmail: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  rpmLimit: number;
  active: boolean;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
};

// ---------- In-memory key store (DEV fallback) ----------
// When `B2B_DEV_KEY` env is set, accept that key in dev/staging w/o DB.
// Prod path reads from Prisma B2BApiKey table (added in handoff doc DDL).

const DEV_KEY_ENV = 'B2B_DEV_KEY';

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

function lookupDevKey(key: string): B2BApiKeyRecord | null {
  const devKey = process.env[DEV_KEY_ENV];
  if (!devKey || key !== devKey) return null;
  return {
    id: 'dev_key_local',
    orgName: 'DEV_PARTNER',
    contactEmail: 'dev@darshya.online',
    keyPrefix: 'dk_dev_',
    keyHash: sha256(devKey),
    scopes: ['read:temples', 'read:bookings', 'read:pandits', 'read:donations', 'read:darshan-schedule'],
    rpmLimit: 60,
    active: true,
    lastUsedAt: null,
    revokedAt: null,
  };
}

// Prod lookup hook — wired to Prisma in Phase 1.
// For now returns null (forcing DEV_KEY path or 401).
async function lookupDbKey(_key: string): Promise<B2BApiKeyRecord | null> {
  // TODO(R-Q3-E-007 Phase 1): replace with prisma.b2BApiKey.findUnique({ where: { keyHash: sha256(_key) } })
  return null;
}

async function resolveApiKey(rawKey: string): Promise<B2BApiKeyRecord | null> {
  if (!rawKey || typeof rawKey !== 'string') return null;
  const dev = lookupDevKey(rawKey);
  if (dev) return dev;
  return lookupDbKey(rawKey);
}

// ---------- Per-key rate limiter ----------

type RateState = { count: number; windowStartMs: number };
const RATE_BUCKETS = new Map<string, RateState>();
const WINDOW_MS = 60_000;

function checkRate(keyId: string, limit: number): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const bucket = RATE_BUCKETS.get(keyId);
  if (!bucket || now - bucket.windowStartMs >= WINDOW_MS) {
    RATE_BUCKETS.set(keyId, { count: 1, windowStartMs: now });
    return { ok: true };
  }
  if (bucket.count >= limit) {
    const retryAfterSec = Math.ceil((bucket.windowStartMs + WINDOW_MS - now) / 1000);
    return { ok: false, retryAfterSec };
  }
  bucket.count += 1;
  return { ok: true };
}

// ---------- Middleware ----------

declare module 'fastify' {
  interface FastifyRequest {
    b2bApiKey?: B2BApiKeyRecord;
  }
}

const HEADER_NAME = 'x-darshya-key';

async function authenticateB2B(req: FastifyRequest, reply: FastifyReply) {
  const rawKey = req.headers[HEADER_NAME];
  if (!rawKey || typeof rawKey !== 'string') {
    return reply.code(401).send({ error: 'missing_api_key', message: `Set ${HEADER_NAME} header.` });
  }
  const record = await resolveApiKey(rawKey);
  if (!record) {
    return reply.code(401).send({ error: 'invalid_api_key' });
  }
  if (!record.active || record.revokedAt) {
    return reply.code(401).send({ error: 'revoked_api_key' });
  }
  const rate = checkRate(record.id, record.rpmLimit);
  if (!rate.ok) {
    reply.header('Retry-After', String(rate.retryAfterSec));
    return reply.code(429).send({ error: 'rate_limit_exceeded', retryAfterSec: rate.retryAfterSec });
  }
  req.b2bApiKey = record;
  // Fire-and-forget lastUsedAt update — no DB in dev path.
}

function requireScope(scope: string) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.b2bApiKey || !req.b2bApiKey.scopes.includes(scope)) {
      return reply.code(403).send({ error: 'insufficient_scope', required: scope });
    }
  };
}

// ---------- PII masking helpers ----------

function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return sha256(email.toLowerCase()).slice(0, 16);
}

function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  if (phone.length <= 4) return '****';
  return `***${phone.slice(-4)}`;
}

// ---------- Routes ----------

export async function b2bRoutes(server: FastifyInstance) {
  // Apply auth + rate-limit to ALL routes in this plugin.
  server.addHook('preHandler', authenticateB2B);

  // Health check (auth still required — proves the key works).
  server.get('/ping', async (req) => ({
    ok: true,
    org: req.b2bApiKey?.orgName,
    scopes: req.b2bApiKey?.scopes,
  }));

  // GET /temples — paginated list, no PII
  server.get('/temples', { preHandler: requireScope('read:temples') }, async (req, reply) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_query', issues: parsed.error.issues });
    // Stub response — Phase 1 wires to templeService.findAll(); kept env-or-noop here so
    // the route works without DB during partner pilot probes.
    return reply.send({
      data: [],
      pagination: { limit: parsed.data.limit, cursor: parsed.data.cursor ?? null, nextCursor: null },
      _stub: 'Phase 1: wire to templeService.findAll({ isVerified: true, limit, cursor })',
    });
  });

  // GET /bookings — masked PII, ?since filter
  server.get('/bookings', { preHandler: requireScope('read:bookings') }, async (req, reply) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_query', issues: parsed.error.issues });
    return reply.send({
      data: [],
      pagination: { limit: parsed.data.limit, cursor: parsed.data.cursor ?? null, nextCursor: null },
      _piiPolicy: 'email -> sha256 prefix, phone -> last4',
      _stub: 'Phase 1: wire to bookingService w/ maskEmail/maskPhone',
    });
  });

  // GET /pandits — public profile + availability summary
  server.get('/pandits', { preHandler: requireScope('read:pandits') }, async (req, reply) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_query', issues: parsed.error.issues });
    return reply.send({
      data: [],
      pagination: { limit: parsed.data.limit, cursor: parsed.data.cursor ?? null, nextCursor: null },
      _stub: 'Phase 1: wire to priestsPublicService.list({ verified: true })',
    });
  });

  // GET /donations — aggregated, no donor PII without scope:read:donor-pii
  server.get('/donations', { preHandler: requireScope('read:donations') }, async (req, reply) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_query', issues: parsed.error.issues });
    const hasDonorPii = req.b2bApiKey?.scopes.includes('read:donor-pii') ?? false;
    return reply.send({
      data: [],
      pagination: { limit: parsed.data.limit, cursor: parsed.data.cursor ?? null, nextCursor: null },
      _donorPii: hasDonorPii ? 'included' : 'masked',
      _stub: 'Phase 1: wire to donationService.aggregate({ templeId })',
    });
  });

  // GET /darshan-schedule — public live darshan window list
  server.get('/darshan-schedule', { preHandler: requireScope('read:darshan-schedule') }, async (req, reply) => {
    const parsed = sinceQuerySchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_query', issues: parsed.error.issues });
    return reply.send({
      data: [],
      _stub: 'Phase 1: wire to darshanScheduleService.list({ since })',
    });
  });

  // OpenAPI spec (minimal hand-rolled). Replace with @fastify/swagger in Phase 2.
  server.get('/openapi.json', async () => ({
    openapi: '3.0.0',
    info: { title: 'Darshya B2B Temple SaaS API', version: '1.0.0-mvp' },
    servers: [{ url: 'https://api.darshya.online/api/v1/b2b' }],
    components: {
      securitySchemes: {
        apiKey: { type: 'apiKey', in: 'header', name: HEADER_NAME },
      },
    },
    security: [{ apiKey: [] }],
    paths: {
      '/ping': { get: { summary: 'Auth probe' } },
      '/temples': { get: { summary: 'List verified temples', parameters: [{ name: 'limit', in: 'query' }, { name: 'cursor', in: 'query' }] } },
      '/bookings': { get: { summary: 'List bookings (PII masked)', parameters: [{ name: 'since', in: 'query' }] } },
      '/pandits': { get: { summary: 'List verified pandits w/ availability' } },
      '/donations': { get: { summary: 'List aggregated donations' } },
      '/darshan-schedule': { get: { summary: 'List live darshan windows' } },
    },
  }));
}

// ---------- Test exports ----------

export const __testing = {
  sha256,
  maskEmail,
  maskPhone,
  resolveApiKey,
  checkRate,
  listQuerySchema,
  sinceQuerySchema,
  WINDOW_MS,
  HEADER_NAME,
  RATE_BUCKETS,
};
