import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { adminGurukulsRoutes } from './admin-gurukuls.js';

/**
 * SCAL-04 — GET /admin/gurukuls fetches whole rows off a whole-table scan.
 *
 * This read has no `take`, and it is staying that way: the admin moderation
 * screen renders the complete list, and capping it without the paired UI change
 * would truncate an operator's view with nothing on screen to say so — the
 * trade the SCAL-04 ratchet has already refused twice. The finding says to go
 * after MEASURED PAYLOAD, not call-site count, and the payload here is not the
 * row count. It is the row WIDTH.
 *
 * The query used `include`, and `include` without `select` returns every scalar
 * column of the model. `model Gurukul` declares 20; the handler's own `.map()`
 * returns 12. The 8 it threw away included `description` — a required, uncapped
 * `String` holding the directory blurb, and the only column on the model whose
 * size is not bounded by a short identifier. On a whole-table scan that is the
 * entire prose of every gurukul on the platform crossing the wire into a 512 MB
 * container, on a screen that never renders a character of it.
 *
 * Narrowing to a `select` is invisible from outside: the response is built by an
 * explicit `.map()`, so the JSON is byte-identical. The assertions below pin
 * BOTH halves — the columns are narrowed AND the body is unchanged — so this
 * cannot be satisfied by returning less to the operator.
 */

const API_ROOT = join(import.meta.dirname, '..', '..');

const DEMO_ADMIN = {
  id: 'user-demo-admin-1',
  email: 'admin@demo.com',
  phone: null,
  fullName: 'Demo Admin',
  subscriptionTier: 'bhakti_pass',
  blocked: false,
};

/** Exactly the columns the handler's `.map()` reads. */
const USED_SCALARS = [
  'id',
  'slug',
  'name',
  'city',
  'state',
  'tradition',
  'isVerified',
  'isActive',
  'contactEmail',
  'contactPhone',
  'websiteUrl',
  'createdAt',
] as const;

const GURUKUL_ROW = {
  id: 'gurukul-1',
  slug: 'sampurnanand-sanskrit-vidyalaya',
  name: 'Sampurnanand Sanskrit Vidyalaya',
  city: 'Varanasi',
  state: 'UP',
  tradition: 'Vedic',
  isVerified: false,
  isActive: true,
  contactEmail: 'info@example.com',
  contactPhone: '+911234567890',
  websiteUrl: 'https://example.com',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  owner: { email: 'owner@example.com', fullName: 'Owner Name' },
  _count: { programs: 3 },
};

/** Scalar field names declared on a Prisma model. */
function modelScalars(model: string): string[] {
  const schema = readFileSync(join(API_ROOT, 'prisma', 'schema.prisma'), 'utf8');
  const m = new RegExp(`^model\\s+${model}\\s*\\{([\\s\\S]*?)^\\}`, 'm').exec(schema);
  if (!m) throw new Error(`model ${model} not found`);
  const out: string[] = [];
  for (const raw of m[1]!.split('\n')) {
    const line = raw.replace(/\/\/.*$/, '').trim();
    if (!line || line.startsWith('@@')) continue;
    const f = /^([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)(\[\])?(\?)?/.exec(line);
    if (!f) continue;
    // Relation fields are typed with a model name (capitalised); skip them.
    if (/^[A-Z]/.test(f[2]!) && !['String', 'Int', 'Boolean', 'DateTime', 'Float', 'Json', 'Decimal', 'BigInt', 'Bytes'].includes(f[2]!)) continue;
    out.push(f[1]!);
  }
  return out;
}

function makeApp() {
  const app = Fastify();
  void app.register(adminGurukulsRoutes, { prefix: '/api/v1/admin/gurukuls' });
  return app;
}

async function listGurukuls() {
  const app = makeApp();
  return app.inject({
    method: 'GET',
    url: '/api/v1/admin/gurukuls/?status=all',
    headers: { authorization: 'Bearer demo-admin' },
  });
}

describe('SCAL-04 — /admin/gurukuls stops fetching whole rows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOW_DEMO_TOKENS = 'true';
    prismaMock.user.findUnique.mockImplementation(async (args: never) =>
      (args as { where: { email?: string } }).where.email === 'admin@demo.com' ? DEMO_ADMIN : null,
    );
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { userId: DEMO_ADMIN.id, role: 'ADMIN' },
    ] as never);
    prismaMock.gurukul.findMany.mockResolvedValue([GURUKUL_ROW] as never);
  });

  it('the model really is wider than the screen — otherwise this guard is pointless', () => {
    const scalars = modelScalars('Gurukul');
    expect(scalars).toContain('description');
    // If someone narrows the model itself, this guard has less to protect and
    // the numbers in the docblock above should be re-derived rather than trusted.
    expect(scalars.length).toBeGreaterThan(USED_SCALARS.length);
  });

  it('pins its columns instead of fetching the whole row', async () => {
    const res = await listGurukuls();
    expect(res.statusCode).toBe(200);

    const args = prismaMock.gurukul.findMany.mock.calls[0]![0] as {
      select?: Record<string, unknown>;
      include?: Record<string, unknown>;
    };

    expect(
      args.select,
      'the query must name its columns; `include` alone returns every scalar on the model',
    ).toBeDefined();
    expect(
      args.include,
      '`include` and `select` are mutually exclusive — `include` means the full row came back',
    ).toBeUndefined();
  });

  it('does not fetch a column the response never returns', async () => {
    await listGurukuls();
    const args = prismaMock.gurukul.findMany.mock.calls[0]![0] as {
      select?: Record<string, unknown>;
    };
    // Without this the check below passes vacuously on an `include`-only query:
    // no `select` means no selected columns means nothing to complain about,
    // while the full row is in fact coming back.
    expect(args.select, 'no `select` — this assertion would be checking nothing').toBeDefined();
    const selected = Object.keys(args.select ?? {});
    const scalars = new Set(modelScalars('Gurukul'));
    const selectedScalars = selected.filter((k) => scalars.has(k));

    // `description` is the uncapped free-text blurb and the single widest
    // column on the model. Nothing in the response reads it.
    expect(
      selectedScalars,
      'the whole-table scan is still dragging the directory blurb across the wire',
    ).not.toContain('description');

    // And nothing else unused either — every scalar asked for must be one the
    // handler's `.map()` actually reads.
    const unused = selectedScalars.filter((k) => !(USED_SCALARS as readonly string[]).includes(k));
    expect(unused, `columns fetched but never returned: ${unused.join(', ')}`).toEqual([]);
  });

  it('returns exactly the same body it did before narrowing', async () => {
    const res = await listGurukuls();
    const body = res.json() as { gurukuls: Array<Record<string, unknown>> };

    // Every field the admin screen binds to, unchanged. A narrower query must
    // not become a narrower answer.
    expect(body.gurukuls).toHaveLength(1);
    expect(body.gurukuls[0]).toEqual({
      id: 'gurukul-1',
      slug: 'sampurnanand-sanskrit-vidyalaya',
      name: 'Sampurnanand Sanskrit Vidyalaya',
      city: 'Varanasi',
      state: 'UP',
      tradition: 'Vedic',
      isVerified: false,
      isActive: true,
      contactEmail: 'info@example.com',
      contactPhone: '+911234567890',
      websiteUrl: 'https://example.com',
      ownerEmail: 'owner@example.com',
      ownerName: 'Owner Name',
      programCount: 3,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('still counts programs and still resolves the owner', async () => {
    await listGurukuls();
    const args = prismaMock.gurukul.findMany.mock.calls[0]![0] as {
      select?: Record<string, unknown>;
    };
    // Narrowing must not drop the two nested reads the screen depends on.
    expect(args.select?._count).toBeDefined();
    expect(args.select?.owner).toBeDefined();
  });
});
