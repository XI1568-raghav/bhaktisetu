import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { donationRoutes } from './donations.js';

// TZ-01: donations.created_at / paid_at are `timestamp(3)` (no tz). A raw
// now() or the column DEFAULT CURRENT_TIMESTAMP stored session-local time -
// 5.5 h off UTC on an IST database. The INSERT must now stamp created_at
// explicitly in UTC.

const DEVOTEE = {
  id: '99999999-9999-4999-8999-999999999999',
  email: 'devotee@demo.com',
  phone: null,
  fullName: 'Demo Devotee',
  subscriptionTier: 'free',
  blocked: false,
};
const OWNER_ID = '659a2081-0abe-444d-9cb7-ac06e4147cd6';
const PROFILE = {
  id: '69206fc0-9e9b-441a-a85f-b2d703b15afd',
  userId: OWNER_ID,
  gaushalaName: 'Shri Krishna Gaushala',
  description: 'ISKCON-affiliated cow shelter.',
  address: 'Raman Reti, Vrindavan',
  approved: true,
};

describe('donations - UTC-safe timestamps (TZ-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOW_DEMO_TOKENS = 'true';
    prismaMock.user.findUnique.mockImplementation(async (args: any) =>
      args.where.email === 'devotee@demo.com' ? DEVOTEE : null,
    );
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
    prismaMock.$executeRawUnsafe.mockResolvedValue(1);
    prismaMock.gaushalaProfile.findFirst.mockImplementation(async (args: any) =>
      JSON.stringify(args.where).includes(OWNER_ID) ? PROFILE : null,
    );
  });

  it('create-order INSERT stamps created_at with now() AT TIME ZONE UTC', async () => {
    const app = Fastify();
    void app.register(donationRoutes, { prefix: '/api/v1/donations' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/donations/create-order',
      headers: { authorization: 'Bearer demo-devotee' },
      payload: { causeKind: 'gaushala', gaushalaId: OWNER_ID, amountInr: 501 },
    });
    expect(res.statusCode).toBe(200);
    const insert = prismaMock.$executeRawUnsafe.mock.calls.find((c: any[]) =>
      String(c[0]).includes('INSERT INTO donations'),
    );
    expect(insert).toBeTruthy();
    const sql = String(insert![0]);
    expect(sql).toMatch(/\(.*dedication, created_at\)/);
    expect(sql).toContain(`(now() AT TIME ZONE 'UTC')`);
    // No bare now()/CURRENT_TIMESTAMP outside the UTC wrapper.
    expect(sql.replace(`(now() AT TIME ZONE 'UTC')`, '')).not.toMatch(/now\(\)|CURRENT_TIMESTAMP/i);
  });
});
