import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { adminRoutes } from './admin.js';
import { templeFlags } from './admin-temple-editor.js';
import {
  STANDARD_OFFERING_PUJA_SLUGS,
  STANDARD_OFFERING_SLOTS,
} from '../services/temple-standard-offerings.service.js';

const ADMIN = {
  id: 'user-demo-admin-1',
  email: 'admin@demo.com',
  phone: null,
  fullName: 'Demo Admin',
  subscriptionTier: 'bhakti_pass',
  blocked: false,
};
const DEVOTEE = { ...ADMIN, id: 'user-demo-devotee-1', email: 'devotee@demo.com' };

const ID = '11111111-1111-4111-8111-111111111111';
const GHOST = '00000000-0000-0000-0000-000000000000';

const PENDING = {
  id: ID,
  name: 'Manager Temple',
  slug: 'manager-temple',
  description: 'desc',
  deityPrimary: 'Shiva',
  city: 'Gurugram',
  state: 'Haryana',
  addressLine: 'Sector 1',
  pincode: '',
  lat: 0,
  lng: 0,
  isVerified: false,
  verificationDate: null,
  status: 'pending_review',
  updatedAt: new Date('2026-10-01T00:00:00Z'),
  _count: { pujaOfferings: 0 },
};

async function call(
  method: 'GET' | 'POST' | 'PATCH',
  url: string,
  payload?: Record<string, unknown>,
  token = 'demo-admin',
) {
  const app = Fastify({ logger: false });
  await app.register(async (i) => adminRoutes(i), { prefix: '/api/v1/admin' });
  const res = await app.inject({
    method,
    url: `/api/v1/admin${url}`,
    headers: { authorization: `Bearer ${token}` },
    ...(payload === undefined ? {} : { payload }),
  });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.resetAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) => {
    if (args.where.email === 'admin@demo.com') return ADMIN;
    if (args.where.email === 'devotee@demo.com') return DEVOTEE;
    return null;
  });
});

describe('templeFlags', () => {
  it('flags a temple at 0,0 and an empty pincode', () => {
    expect(templeFlags({ lat: 0, lng: 0, pincode: '' })).toEqual([
      'coordinates_missing',
      'pincode_invalid',
    ]);
  });
  it('a real location has no flags; only BOTH zero is flagged', () => {
    expect(templeFlags({ lat: 28.6, lng: 77.2, pincode: '110001' })).toEqual([]);
    expect(templeFlags({ lat: 0, lng: 77.2, pincode: '110001' })).toEqual([]);
  });
});

describe('PATCH /admin/temples/:id', () => {
  it('is admin only', async () => {
    const res = await call('PATCH', `/temples/${ID}`, { name: 'X Temple' }, 'demo-devotee');
    expect(res.statusCode).toBe(403);
    expect(prismaMock.temple.update).not.toHaveBeenCalled();
  });

  it('404s for an unknown or malformed id (never a fabricated 200)', async () => {
    prismaMock.temple.findUnique.mockResolvedValue(null as never);
    expect((await call('PATCH', `/temples/${GHOST}`, { name: 'Ghost' })).statusCode).toBe(404);
    expect((await call('PATCH', '/temples/not-a-uuid', { name: 'Ghost' })).statusCode).toBe(404);
    expect(prismaMock.temple.update).not.toHaveBeenCalled();
  });

  it.each([
    ['lat above 90', { lat: 91 }],
    ['lat below -90', { lat: -90.5 }],
    ['lng above 180', { lng: 181 }],
    ['lng below -180', { lng: -181 }],
    ['5 digit pincode', { pincode: '12345' }],
    ['alpha pincode', { pincode: '12A456' }],
    ['unknown field', { slug: 'hijack' }],
    ['bad status', { status: 'deleted' }],
    ['empty body', {}],
  ])('rejects %s with 400', async (_label, body) => {
    const res = await call('PATCH', `/temples/${ID}`, body);
    expect(res.statusCode).toBe(400);
    expect(prismaMock.temple.update).not.toHaveBeenCalled();
  });

  it('refuses to verify a temple left at 0,0 / empty pincode', async () => {
    prismaMock.temple.findUnique.mockResolvedValue(PENDING as never);
    const res = await call('PATCH', `/temples/${ID}`, { isVerified: true });
    expect(res.statusCode).toBe(400);
    expect(res.json().flags).toEqual(['coordinates_missing', 'pincode_invalid']);
    expect(prismaMock.temple.update).not.toHaveBeenCalled();
  });

  it('lets one PATCH fix the location and verify, activating the temple', async () => {
    prismaMock.temple.findUnique.mockResolvedValue(PENDING as never);
    prismaMock.temple.update.mockResolvedValue({
      ...PENDING,
      pincode: '122001',
      lat: 28.46,
      lng: 77.03,
      isVerified: true,
      status: 'active',
      verificationDate: new Date(),
    } as never);
    const res = await call('PATCH', `/temples/${ID}`, {
      pincode: '122001',
      lat: 28.46,
      lng: 77.03,
      isVerified: true,
    });
    expect(res.statusCode).toBe(200);
    const arg = prismaMock.temple.update.mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(arg.data).toMatchObject({
      pincode: '122001',
      lat: 28.46,
      lng: 77.03,
      isVerified: true,
      status: 'active',
    });
    expect(arg.data.verificationDate).toBeInstanceOf(Date);
    const body = res.json();
    expect(body.temple.flags).toEqual([]);
    // Audit-friendly: the response carries a from/to diff of what changed.
    expect(body.changes.lat).toEqual({ from: 0, to: 28.46 });
    expect(body.changes.isVerified).toEqual({ from: false, to: true });
  });

  it('un-verifying moves the temple back to pending_review unless a status is given', async () => {
    prismaMock.temple.findUnique.mockResolvedValue({
      ...PENDING,
      pincode: '122001',
      lat: 28.46,
      lng: 77.03,
      isVerified: true,
      status: 'active',
    } as never);
    prismaMock.temple.update.mockResolvedValue(PENDING as never);
    await call('PATCH', `/temples/${ID}`, { isVerified: false });
    const arg = prismaMock.temple.update.mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(arg.data).toMatchObject({ isVerified: false, status: 'pending_review' });
  });

  it('refuses to move an already-verified temple back to 0,0 or a blank pincode', async () => {
    const VERIFIED = { ...PENDING, pincode: '122001', lat: 28.46, lng: 77.03, isVerified: true, status: 'active' };
    prismaMock.temple.findUnique.mockResolvedValue(VERIFIED as never);
    const a = await call('PATCH', `/temples/${ID}`, { lat: 0, lng: 0 });
    expect(a.statusCode).toBe(400);
    expect(a.json().flags).toEqual(['coordinates_missing']);
    const b = await call('PATCH', `/temples/${ID}`, { pincode: '12ab' });
    expect(b.statusCode).toBe(400);
    expect(prismaMock.temple.update).not.toHaveBeenCalled();
    // Un-verifying in the same PATCH is the sanctioned way to park it.
    prismaMock.temple.update.mockResolvedValue(PENDING as never);
    const c = await call('PATCH', `/temples/${ID}`, { lat: 0, lng: 0, isVerified: false });
    expect(c.statusCode).toBe(200);
  });

  it('a plain edit does not touch verification fields', async () => {
    prismaMock.temple.findUnique.mockResolvedValue(PENDING as never);
    prismaMock.temple.update.mockResolvedValue({ ...PENDING, name: 'Renamed Temple' } as never);
    const res = await call('PATCH', `/temples/${ID}`, { name: 'Renamed Temple' });
    expect(res.statusCode).toBe(200);
    const arg = prismaMock.temple.update.mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(arg.data).toEqual({ name: 'Renamed Temple' });
  });
});

describe('GET /admin/temples/:id', () => {
  it('returns the editor payload with flags and active offering count', async () => {
    prismaMock.temple.findUnique.mockResolvedValue(PENDING as never);
    const body = (await call('GET', `/temples/${ID}`)).json();
    expect(body.temple.activeOfferings).toBe(0);
    expect(body.temple.flags).toContain('coordinates_missing');
    expect(body.temple._count).toBeUndefined();
  });
  it('404s when missing', async () => {
    prismaMock.temple.findUnique.mockResolvedValue(null as never);
    expect((await call('GET', `/temples/${GHOST}`)).statusCode).toBe(404);
  });
});

describe('POST /admin/temples/:id/standard-offerings', () => {
  const catalogue = STANDARD_OFFERING_PUJA_SLUGS.map((slug, i) => ({ id: `pt-${i}`, slug }));

  it('is admin only', async () => {
    const res = await call('POST', `/temples/${ID}/standard-offerings`, undefined, 'demo-devotee');
    expect(res.statusCode).toBe(403);
    expect(prismaMock.templePujaOffering.createMany).not.toHaveBeenCalled();
  });

  it('404s for an unknown temple', async () => {
    prismaMock.temple.findUnique.mockResolvedValue(null as never);
    const res = await call('POST', `/temples/${GHOST}/standard-offerings`);
    expect(res.statusCode).toBe(404);
  });

  it('adds the whole standard set to a temple with none: active, unassigned, no price override', async () => {
    prismaMock.temple.findUnique.mockResolvedValue({ id: ID } as never);
    prismaMock.pujaType.findMany.mockResolvedValue(catalogue as never);
    prismaMock.templePujaOffering.findMany.mockResolvedValue([] as never);
    const res = await call('POST', `/temples/${ID}/standard-offerings`);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ added: 5, alreadyPresent: 0, missingFromCatalogue: [] });
    const arg = prismaMock.templePujaOffering.createMany.mock.calls[0]![0] as {
      data: Record<string, unknown>[];
      skipDuplicates: boolean;
    };
    expect(arg.skipDuplicates).toBe(true);
    expect(arg.data).toHaveLength(5);
    for (const row of arg.data) {
      expect(row).toMatchObject({ templeId: ID, isActive: true });
      expect(row.assignedPriestId).toBeUndefined();
      expect(row.priceOverride).toBeUndefined();
      expect(row.availableSlots).toEqual([...STANDARD_OFFERING_SLOTS]);
    }
  });

  it('is idempotent: with every standard row present it writes nothing', async () => {
    prismaMock.temple.findUnique.mockResolvedValue({ id: ID } as never);
    prismaMock.pujaType.findMany.mockResolvedValue(catalogue as never);
    prismaMock.templePujaOffering.findMany.mockResolvedValue(
      catalogue.map((c) => ({ pujaTypeId: c.id })) as never,
    );
    const res = await call('POST', `/temples/${ID}/standard-offerings`);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ added: 0, alreadyPresent: 5 });
    expect(prismaMock.templePujaOffering.createMany).not.toHaveBeenCalled();
  });

  it('never changes an existing offering (even a deactivated one): no update/upsert, only inserts the gap', async () => {
    prismaMock.temple.findUnique.mockResolvedValue({ id: ID } as never);
    prismaMock.pujaType.findMany.mockResolvedValue(catalogue as never);
    // Existing row for pt-0 (could be inactive or custom priced): must be left alone.
    prismaMock.templePujaOffering.findMany.mockResolvedValue([{ pujaTypeId: 'pt-0' }] as never);
    const res = await call('POST', `/temples/${ID}/standard-offerings`);
    expect(res.json()).toMatchObject({ added: 4, alreadyPresent: 1 });
    const arg = prismaMock.templePujaOffering.createMany.mock.calls[0]![0] as {
      data: { pujaTypeId: string }[];
    };
    expect(arg.data.map((d) => d.pujaTypeId)).not.toContain('pt-0');
    expect(prismaMock.templePujaOffering.update).not.toHaveBeenCalled();
  });

  it('reports catalogue gaps instead of failing', async () => {
    prismaMock.temple.findUnique.mockResolvedValue({ id: ID } as never);
    prismaMock.pujaType.findMany.mockResolvedValue(catalogue.slice(0, 3) as never);
    prismaMock.templePujaOffering.findMany.mockResolvedValue([] as never);
    const body = (await call('POST', `/temples/${ID}/standard-offerings`)).json();
    expect(body.added).toBe(3);
    expect(body.missingFromCatalogue).toEqual(STANDARD_OFFERING_PUJA_SLUGS.slice(3));
  });
});

describe('ops/sql/seed-default-temple-offerings.sql', () => {
  const sql = fs.readFileSync(
    path.resolve(__dirname, '../../../../ops/sql/seed-default-temple-offerings.sql'),
    'utf8',
  );
  const body = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');

  it('uses the same puja slugs as the API service', () => {
    const lists = [...body.matchAll(/p\.slug IN \(([^)]*)\)/g)].map((m) =>
      [...m[1]!.matchAll(/'([^']+)'/g)].map((x) => x[1]),
    );
    expect(lists.length).toBe(2);
    for (const l of lists) expect(l).toEqual([...STANDARD_OFFERING_PUJA_SLUGS]);
  });

  it('uses the same slots as the API service', () => {
    const m = body.match(/'(\[[^']*\])'::jsonb/);
    expect(JSON.parse(m![1]!)).toEqual([...STANDARD_OFFERING_SLOTS]);
  });

  it('is insert-only, idempotent and never assigns a priest or price', () => {
    expect(body).not.toMatch(/\bUPDATE\b|\bDELETE\b|\bDROP\b|\bALTER\b|\bTRUNCATE\b/i);
    expect(body).toMatch(/NOT EXISTS \(SELECT 1 FROM temple_puja_offerings/);
    expect(body).toMatch(/ON CONFLICT \(temple_id, puja_type_id\) DO NOTHING/);
    expect(body).toMatch(/gen_random_uuid\(\)/);
    expect(body).toMatch(/NULL, NULL, NULL,/);
  });

  it('prints a would-add count before inserting', () => {
    expect(body.indexOf('would_add')).toBeGreaterThan(-1);
    expect(body.indexOf('would_add')).toBeLessThan(body.indexOf('INSERT INTO'));
  });
});
