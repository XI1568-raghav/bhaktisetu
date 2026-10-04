import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { donationRoutes } from './donations.js';

// S-05 (prod sweep 2026-08-12): a devotee donates ₹2,100 to a gaushala, the
// verify call returns {"ok":true,...,"status":"paid"} and an 80G receipt — and
// GET /gaushala-portal/donations returns {"donations":[]} for the recipient,
// forever. Two halves: the public directory hands the form a static fixture id
// (`gs_001`), which is written verbatim into `donations.gaushala_id`, while the
// portal filters on the manager's User UUID. The ids never meet.
//
// The donee is now resolved BEFORE the money is taken: a real GaushalaProfile
// (by profile id, by owner id, or by the fixture's name) collapses to the one
// key the portal reads, and an id that matches no onboarded gaushala is
// refused rather than banked against a donee that does not exist.

const DEVOTEE = {
  id: '99999999-9999-4999-8999-999999999999',
  email: 'devotee@demo.com',
  phone: null,
  fullName: 'Demo Devotee',
  subscriptionTier: 'free',
  blocked: false,
};

const OWNER_ID = '659a2081-0abe-444d-9cb7-ac06e4147cd6';
const PROFILE_ID = '69206fc0-9e9b-441a-a85f-b2d703b15afd';
const PROFILE = {
  id: PROFILE_ID,
  userId: OWNER_ID,
  gaushalaName: 'Shri Krishna Gaushala',
  description: 'ISKCON-affiliated cow shelter.',
  address: 'Raman Reti, Vrindavan',
  approved: true,
};

function makeApp() {
  const app = Fastify();
  void app.register(donationRoutes, { prefix: '/api/v1/donations' });
  return app;
}

/** The gaushala_id positional argument of the donations INSERT. */
function insertedGaushalaId(): unknown {
  return donationInsert()?.[3];
}

// `ensureGaushalaTaxFields()` fires two ALTER TABLE statements through the same
// mock at route registration, so "no donation was written" has to be asserted
// against the INSERT specifically, not the call count.
function donationInsert(): any[] | undefined {
  return prismaMock.$executeRawUnsafe.mock.calls.find((c: any[]) =>
    String(c[0]).includes('INSERT INTO donations'),
  );
}

describe('donations — gaushala donee resolution (S-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOW_DEMO_TOKENS = 'true';
    prismaMock.user.findUnique.mockImplementation(async (args: any) =>
      args.where.email === 'devotee@demo.com' ? DEVOTEE : null,
    );
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
    prismaMock.$executeRawUnsafe.mockResolvedValue(1);
    prismaMock.gaushalaProfile.findFirst.mockResolvedValue(null);
  });

  it('stores the owner id the portal filters on when given a GaushalaProfile id', async () => {
    prismaMock.gaushalaProfile.findFirst.mockImplementation(async (args: any) =>
      args.where?.id === PROFILE_ID || args.where?.OR?.some((o: any) => o.id === PROFILE_ID)
        ? PROFILE
        : null,
    );
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/donations/create-order',
      headers: { authorization: 'Bearer demo-devotee' },
      payload: { causeKind: 'gaushala', gaushalaId: PROFILE_ID, amountInr: 2100 },
    });
    expect(res.statusCode).toBe(200);
    expect(insertedGaushalaId()).toBe(OWNER_ID);
  });

  it('accepts the owner id directly and keeps it', async () => {
    prismaMock.gaushalaProfile.findFirst.mockImplementation(async (args: any) =>
      JSON.stringify(args.where).includes(OWNER_ID) ? PROFILE : null,
    );
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/donations/create-order',
      headers: { authorization: 'Bearer demo-devotee' },
      payload: { causeKind: 'gaushala', gaushalaId: OWNER_ID, amountInr: 501 },
    });
    expect(res.statusCode).toBe(200);
    expect(insertedGaushalaId()).toBe(OWNER_ID);
  });

  it('maps a legacy directory fixture id onto the real gaushala of that name', async () => {
    prismaMock.gaushalaProfile.findFirst.mockImplementation(async (args: any) =>
      JSON.stringify(args.where).includes('Shri Krishna Gaushala') ? PROFILE : null,
    );
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/donations/create-order',
      headers: { authorization: 'Bearer demo-devotee' },
      payload: { causeKind: 'gaushala', gaushalaId: 'gs_001', amountInr: 2100 },
    });
    expect(res.statusCode).toBe(200);
    expect(insertedGaushalaId()).toBe(OWNER_ID);
  });

  it('refuses to take money for a gaushala that is not onboarded', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/donations/create-order',
      headers: { authorization: 'Bearer demo-devotee' },
      payload: { causeKind: 'gaushala', gaushalaId: 'gs_002', amountInr: 2100 },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('gaushala_not_onboarded');
    expect(donationInsert()).toBeUndefined();
  });

  it('refuses an unknown uuid rather than writing an orphan donation row', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/donations/create-order',
      headers: { authorization: 'Bearer demo-devotee' },
      payload: {
        causeKind: 'gaushala',
        gaushalaId: '00000000-0000-4000-8000-000000000000',
        amountInr: 2100,
      },
    });
    expect(res.statusCode).toBe(400);
    expect(donationInsert()).toBeUndefined();
  });

  it('leaves the temple path untouched', async () => {
    const app = makeApp();
    const templeId = '11111111-1111-4111-8111-111111111111';
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/donations/create-order',
      headers: { authorization: 'Bearer demo-devotee' },
      payload: { causeKind: 'temple', templeId, amountInr: 2100 },
    });
    expect(res.statusCode).toBe(200);
    const call = prismaMock.$executeRawUnsafe.mock.calls.find((c: any[]) =>
      String(c[0]).includes('temple_id'),
    );
    expect(call?.[3]).toBe(templeId);
    expect(prismaMock.gaushalaProfile.findFirst).not.toHaveBeenCalled();
  });
});
